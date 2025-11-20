import { neon } from '@netlify/neon';

export default async (event, context) => {
  const sql = neon();
  const postId = event.queryStringParameters?.id || 1;
  const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  return new Response(JSON.stringify(post), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
