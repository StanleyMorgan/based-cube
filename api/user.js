import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    if (request.method === 'GET') {
      const { fid } = request.query;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // Get user and their current rank (breaking ties with updated_at)
      const result = await pool.sql`
        SELECT *, 
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.score > u1.score 
             OR (u2.score = u1.score AND u2.updated_at < u1.updated_at)
        ) as rank
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

      // Fetch Neynar Score if API key is present
      let neynarScore = 0;
      if (process.env.NEYNAR_API_KEY) {
        try {
            const neynarRes = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
                headers: { 
                    'api_key': process.env.NEYNAR_API_KEY,
                    'accept': 'application/json'
                }
            });
            if (neynarRes.ok) {
                const data = await neynarRes.json();
                if (data.users && data.users.length > 0) {
                    neynarScore = data.users[0]?.experimental?.neynar_user_score || 0;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch Neynar score", e);
        }
      }

      // Upsert user and return rank with tie-breaker logic
      // Also updates neynar_score on sync
      const result = await pool.sql`
        INSERT INTO users (fid, username, pfp_url, score, streak, neynar_score)
        VALUES (${fid}, ${username}, ${pfpUrl}, 0, 0, ${neynarScore})
        ON CONFLICT (fid) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          pfp_url = EXCLUDED.pfp_url,
          neynar_score = EXCLUDED.neynar_score,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *, 
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.score > users.score 
             OR (u2.score = users.score AND u2.updated_at < users.updated_at)
        ) as rank;
      `;

      return response.status(200).json(result.rows[0]);
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}