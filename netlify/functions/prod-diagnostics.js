import { neon } from '@netlify/neon';

// Temporary diagnostic function. Protect with a token set in Netlify as
// DIAG_TOKEN. Call with header `X-DIAG-TOKEN: <token>` to get a masked
// view of whether the DB env is configured and whether an `admin` row
// exists. Do NOT leave this deployed long-term; remove after debugging.

export default async (event) => {
  try {
    const headerToken = (event.headers && (event.headers['x-diag-token'] || event.headers['X-DIAG-TOKEN'])) || null;
    const expected = process.env.DIAG_TOKEN || null;
    if (!expected || !headerToken || headerToken !== expected) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const sql = neon();
    const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || null;
    const dbConfigured = !!dbUrl;
    let dbMask = null;
    if (dbUrl && dbUrl.startsWith('postgres')) {
      try { dbMask = dbUrl.split('@')[0] + '@...'; } catch (e) { dbMask = '(masked)'; }
    }

    // Check admins table existence and count
    let adminCount = 0;
    try {
      const rows = await sql`SELECT count(*)::int AS cnt FROM admins`;
      adminCount = rows && rows[0] ? rows[0].cnt : 0;
    } catch (e) {
      // If the query fails, surface that for debugging
      return new Response(JSON.stringify({ dbConfigured, dbMask, adminError: String(e.message || e) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ dbConfigured, dbMask, adminCount }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
