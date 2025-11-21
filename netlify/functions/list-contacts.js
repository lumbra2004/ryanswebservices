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

    // Determine provided credential from several sources (header or query)
    const providedRaw = auth;
    let provided = providedRaw && typeof providedRaw === 'string' && providedRaw.startsWith('Bearer ') ? providedRaw.slice(7) : providedRaw;

    // Always allow query params `v` or `p` as another input method — this
    // helps with proxies or clients that strip Authorization headers.
    try {
      if (!provided) {
        if (event.queryStringParameters && (event.queryStringParameters.v || event.queryStringParameters.p)) {
          provided = event.queryStringParameters.v || event.queryStringParameters.p;
        } else if (event.request && event.request.url) {
          const u = new URL(event.request.url);
          const v = u.searchParams.get('v') || u.searchParams.get('p');
          if (v) provided = v;
        } else if (event.url) {
          const u = new URL(event.url);
          const v = u.searchParams.get('v') || u.searchParams.get('p');
          if (v) provided = v;
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    if (!provided) {
      return new Response(JSON.stringify({ error: 'Unauthorized', reason: 'no_credential' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Site-level password fallback: if you set `NETLIFY_VIEW_PASSWORD` in Netlify
    // env vars, accept that plain password (useful for quick fixes). Prefer
    // DB-hash verification when possible.
    const sitePassword = process.env.NETLIFY_VIEW_PASSWORD;
    const showLogs = process.env.SHOW_AUTH_LOGS === '1';
    if (showLogs) {
      try {
        const masked = provided ? (provided.length > 4 ? provided.slice(0,2) + '…' + provided.slice(-2) : '***') : '(none)';
        console.log('[auth-log] provided_len=', provided ? provided.length : 0, 'masked=', masked);
        console.log('[auth-log] sitePassword_present=', !!sitePassword);
      } catch (e) {}
    }
    if (sitePassword && provided === sitePassword) {
      const rows = await sql`SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 200`;
      if (showLogs) console.log('[auth-log] auth_via_site_password=true');
      return new Response(JSON.stringify({ rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

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

    if (showLogs) {
      try {
        console.log('[auth-log] admin_row_exists=', !!(adminRow && adminRow.length), 'isMatch=', !!isMatch);
      } catch (e) {}
    }

    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const rows = await sql`SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 200`;
    return new Response(JSON.stringify({ rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
