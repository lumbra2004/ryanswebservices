import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const dbUrl = process.env.NETLIFY_DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: NETLIFY_DATABASE_URL not set. Put it in .env or export it.');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    console.log('Listing columns for table: admins');
    const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admins' ORDER BY ordinal_position");
    if (!cols.rows || cols.rows.length === 0) {
      console.log('No columns found for table admins (table may not exist).');
    } else {
      for (const c of cols.rows) {
        console.log(`- ${c.column_name}  (${c.data_type})`);
      }
    }

    console.log('\nShowing up to 5 rows from admins:');
    const rows = await client.query('SELECT * FROM admins LIMIT 5');
    if (!rows.rows || rows.rows.length === 0) {
      console.log('No rows in admins table.');
    } else {
      for (const r of rows.rows) {
        console.log(r);
      }
    }
  } catch (err) {
    console.error('Error inspecting admins table:', err.message || err);
    process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main();
