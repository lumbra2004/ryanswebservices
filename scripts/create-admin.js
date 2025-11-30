import dotenv from 'dotenv';
import readline from 'readline';
import { Client } from 'pg';

dotenv.config();

const dbUrl = process.env.NETLIFY_DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: NETLIFY_DATABASE_URL is not set. Put it in .env or export it in your shell.');
  process.exit(1);
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans); });
  });
}

async function main() {
  const usernameArg = process.argv[2];
  const passwordArg = process.argv[3];
  const username = usernameArg || (await ask("Admin username (default 'admin'): ")) || 'admin';
  const password = passwordArg || await ask('Admin password (will be stored hashed): ');

  if (!password) {
    console.error('No password provided; aborting.');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();


    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    await client.query(`CREATE TABLE IF NOT EXISTS admins (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );`);

    const upsert = `INSERT INTO admins (username, password_hash)
      VALUES ($1, crypt($2, gen_salt('bf')))
      ON CONFLICT (username) DO UPDATE SET password_hash = crypt($2, gen_salt('bf'))`;
    await client.query(upsert, [username, password]);

    console.log(`Admin '${username}' created/updated successfully.`);
  } catch (err) {
    console.error('Error creating/updating admin:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main();
