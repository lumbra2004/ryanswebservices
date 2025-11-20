import { neon } from '@netlify/neon';

export default async (req, res) => {
  const sql = neon(); // uses env NETLIFY_DATABASE_URL
  const postId = req.query.id || 1; // fallback to 1 if not provided
  const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  res.status(200).json(post);
};
