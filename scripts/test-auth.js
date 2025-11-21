import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const dbUrl = process.env.NETLIFY_DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: NETLIFY_DATABASE_URL not set in environment or .env');
  process.exit(1);
}

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/test-auth.js <password>');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const res = await client.query('SELECT username, password_hash FROM admins WHERE username = $1 LIMIT 1', ['admin']);
    if (!res.rows || res.rows.length === 0) {
      console.log('No admin row found');
      process.exit(0);
    }
    const row = res.rows[0];
    const verify = await client.query('SELECT (password_hash = crypt($1, password_hash)) as match', [password]);
    const matched = verify && verify.rows && verify.rows[0] ? verify.rows[0].match : false;
    console.log(`admin=${row.username}  hash_len=${row.password_hash ? row.password_hash.length : 0}  matches=${matched}`);
  } catch (err) {
    console.error('Error testing auth:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main();
