import { neon } from '@netlify/neon';

export default async (event, context) => {
  // Allow GET. Support Node and Edge shapes for method detection
  const method = event.httpMethod || (event.request && event.request.method) || event.method;
  if (method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  // Read Authorization header (Bearer <password>)
  let auth = null;
  try {
    if (event.headers && event.headers.authorization) auth = event.headers.authorization;
    else if (event.request && event.request.headers) auth = Object.fromEntries(event.request.headers).authorization;
    else if (event.authorization) auth = event.authorization;
  } catch (e) {
    auth = null;
  }

  // Read expected password from env and normalize (strip optional surrounding quotes)
  const expectedRaw = process.env.NETLIFY_VIEW_PASSWORD || process.env.VIEW_PASSWORD || '';
  const expected = String(expectedRaw).replace(/^\s*"|"\s*$/g, '').trim();
  if (!expected) {
    return new Response(JSON.stringify({ error: 'Admin password not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Expect header like: Bearer thepassword
  const providedRaw = auth;
  const provided = providedRaw && providedRaw.startsWith('Bearer ') ? providedRaw.slice(7) : providedRaw;

  // Also accept password via query param ?p= for easier browser access
  let providedFromQuery = null;
  try {
    // Common Node-style
    if (event.queryStringParameters && event.queryStringParameters.p) {
      providedFromQuery = event.queryStringParameters.p;
    } else {
      // Try several shapes where the full URL may be provided
      const maybeUrl = event.request && event.request.url ? event.request.url : (event.url || event.rawUrl || event.path || '');
      if (maybeUrl) {
        try {
          const url = maybeUrl.startsWith('http') ? new URL(maybeUrl) : new URL(maybeUrl, 'http://localhost');
          providedFromQuery = url.searchParams.get('p');
        } catch (e) {
          providedFromQuery = null;
        }
      }
    }
  } catch (e) {
    providedFromQuery = null;
  }

  const finalProvided = provided || providedFromQuery;
  console.log('Provided from header:', provided);
  console.log('Provided from query:', providedFromQuery);
  console.log('Final provided:', finalProvided);

  // Debug log provided vs expected (do not expose in production logs)
  console.log('Admin provided (final):', finalProvided);
  console.log('Admin expected:', expected);

  if (!finalProvided || finalProvided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const sql = neon();
    const rows = await sql`SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 200`;
    return new Response(JSON.stringify({ rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
