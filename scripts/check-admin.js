import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const dbUrl = process.env.NETLIFY_DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: NETLIFY_DATABASE_URL is not set. Put it in .env or export it in your shell.');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT username, length(password_hash) as hash_len, created_at FROM admins ORDER BY username');
    if (!res.rows || res.rows.length === 0) {
      console.log('No admin rows found.');
      process.exit(0);
    }
    console.log('admins table rows:');
    for (const r of res.rows) {
      console.log(`- username=${r.username}  hash_len=${r.hash_len}  created_at=${r.created_at}`);
    }
  } catch (err) {
    console.error('Error querying admins table:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main();
