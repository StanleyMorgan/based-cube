import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const { fid } = request.query;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // Get user and their current rank
      const result = await sql`
        SELECT *, 
        (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.score > u1.score) as rank
        FROM users u1 
        WHERE fid = ${fid};
      `;

      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'User not found' });
      }

      return response.status(200).json(result.rows[0]);
    }

    if (request.method === 'POST') {
      const { fid, username, pfpUrl } = request.body;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // Upsert user (create if not exists, update profile if exists)
      const result = await sql`
        INSERT INTO users (fid, username, pfp_url, score, streak)
        VALUES (${fid}, ${username}, ${pfpUrl}, 0, 0)
        ON CONFLICT (fid) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          pfp_url = EXCLUDED.pfp_url,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *, (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.score > users.score) as rank;
      `;

      return response.status(200).json(result.rows[0]);
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}