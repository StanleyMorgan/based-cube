import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  try {
    const result = await sql`
      SELECT fid, username, score, pfp_url, 
      (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.score > u1.score) as rank
      FROM users u1
      ORDER BY score DESC
      LIMIT 50;
    `;

    // Map DB fields to frontend expected format if necessary, 
    // but the query matches well. 
    // Front end expects: id, username, score, rank, pfpUrl
    
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