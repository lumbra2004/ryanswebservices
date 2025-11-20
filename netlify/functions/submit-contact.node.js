import { neon } from '@netlify/neon';

export default async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      body = null;
    }

    // Debug log the parsed body so you can see what the function receives
    console.log('Parsed body:', body);

    if (!body || !body.name || !body.email || !body.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing fields', received: body }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const { name, email, message } = body;
    const sql = neon();
    await sql`INSERT INTO contacts (name, email, message) VALUES (${name}, ${email}, ${message})`;
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
