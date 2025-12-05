import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    // Rank logic: Score higher OR (Score equal AND Updated earlier)
    const result = await pool.sql`
      SELECT fid, username, score, pfp_url, 
      (
        SELECT COUNT(*) + 1 
        FROM users u2 
        WHERE u2.score > u1.score 
           OR (u2.score = u1.score AND u2.updated_at < u1.updated_at)
      ) as rank
      FROM users u1
      ORDER BY score DESC, updated_at ASC
      LIMIT 50;
    `;
    
    const entries = result.rows.map(row => ({
      id: row.fid.toString(),
      username: row.username,
      score: row.score,
      rank: parseInt(row.rank),
      pfpUrl: row.pfp_url,
      fid: row.fid
    }));

    return response.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}