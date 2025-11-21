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
    else if (event.request) {
      try {
        // Edge-style headers map
        if (typeof event.request.headers.get === 'function') {
          auth = event.request.headers.get('authorization');
        } else if (event.request.headers) {
          auth = Object.fromEntries(event.request.headers).authorization;
        }
      } catch (e) {
        // ignore
      }
    } else if (event.authorization) auth = event.authorization;
  } catch (e) {
    auth = null;
  }
  

  // For production use, require DB-backed admin password (bcrypt via pgcrypto)
  try {
    const sql = neon();

    // Get provided password from Authorization header only (Bearer <token>)
    const providedRaw = auth;
    const provided = providedRaw && typeof providedRaw === 'string' && providedRaw.startsWith('Bearer ') ? providedRaw.slice(7) : null;

    if (!provided) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Production: verify credential against DB-hashed admin password

    // Check admins table for matching bcrypt hash (Postgres crypt())
    const adminRow = await sql`SELECT password_hash FROM admins WHERE username = 'admin' LIMIT 1`;
    if (!adminRow || adminRow.length === 0) {
      return new Response(JSON.stringify({ error: 'No admin configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const verify = await sql`
      SELECT (password_hash = crypt(${provided}, password_hash)) AS match
      FROM admins
      WHERE username = 'admin'
      LIMIT 1
    `;
    const isMatch = verify && verify[0] ? verify[0].match : false;

    // No debug logs in production: proceed silently on auth check

    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const rows = await sql`SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 200`;
    return new Response(JSON.stringify({ rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
