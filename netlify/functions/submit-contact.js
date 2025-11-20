import { neon } from '@netlify/neon';

export default async (event, context) => {
  // Edge Functions: event.request, Node Functions: event.httpMethod
  let method = event.httpMethod || (event.request && event.request.method);

  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let body;
    if (event.body) {
      // Node Functions
      body = JSON.parse(event.body);
    } else if (event.request) {
      // Edge Functions
      body = await event.request.json();
    } else {
      body = {};
    }

    const { name, email, message } = body;
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const sql = neon();
    await sql`INSERT INTO contacts (name, email, message) VALUES (${name}, ${email}, ${message})`;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
