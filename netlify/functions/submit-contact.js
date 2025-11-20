import { neon } from '@netlify/neon';

export default async (event, context) => {
  // Determine HTTP method (Edge uses event.request)
  // Debug: log top-level event keys to inspect runtime shape
  try {
    console.log('Event keys:', Object.keys(event));
  } catch (e) {
    console.log('Event keys: <unavailable>');
  }
  // Support three shapes:
  // - Node-style: event.httpMethod
  // - Wrapped Edge: event.request.method
  // - Direct Request (Edge): event.method
  const method = event.httpMethod || (event.request && event.request.method) || event.method;
  console.log('Detected method source:', {
    httpMethod: event.httpMethod,
    requestMethod: event.request && event.request.method,
    directMethod: event.method
  });
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Log headers and raw body length for debugging (event.headers exists in Node-style)
    // Normalize headers for logging
    try {
      if (event.headers && typeof event.headers === 'object' && !(event.headers.get)) {
        console.log('Request headers:', event.headers);
      } else if (event.request && event.request.headers) {
        console.log('Request headers:', Object.fromEntries(event.request.headers));
      } else if (event.headers && event.headers.get) {
        console.log('Request headers:', Object.fromEntries(event.headers));
      } else if (event.request && event.request.headers && event.request.headers.get) {
        console.log('Request headers:', Object.fromEntries(event.request.headers));
      } else {
        console.log('Request headers: <unavailable>');
      }
    } catch (e) {
      console.log('Request headers: <error reading>');
    }

    console.log('Raw body length:', event.body ? event.body.length : 0);

    let body = null;
    try {
      if (event && typeof event.json === 'function') {
        // Direct Request (Edge)
        body = await event.json();
      } else if (event.request && typeof event.request.json === 'function') {
        // Wrapped Edge
        body = await event.request.json();
      } else if (event.body) {
        // Node runtime
        body = JSON.parse(event.body || '{}');
      } else {
        body = null;
      }
    } catch (e) {
      body = null;
    }

    console.log('Parsed body:', body);

    if (!body || !body.name || !body.email || !body.message) {
      return new Response(JSON.stringify({ error: 'Missing fields', received: body }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { name, email, message } = body;
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
