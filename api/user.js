import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    if (request.method === 'GET') {
      const { fid } = request.query;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // Get user and their current rank
      // For GET requests, the subquery approach is generally safe, but ensuring exact logic match
      const result = await pool.sql`
        SELECT *, 
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.score > u1.score 
             OR (u2.score = u1.score AND u2.updated_at < u1.updated_at)
             OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)
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
      const { fid, username, pfpUrl, primaryAddress } = request.body;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // 1. Check existing user data to determine if we need to fetch Neynar Score
      const existingUserRes = await pool.sql`
        SELECT neynar_score, neynar_last_updated 
        FROM users 
        WHERE fid = ${fid}
      `;
      
      const existingUser = existingUserRes.rows[0];
      
      let neynarScore = existingUser?.neynar_score || 0;
      let neynarLastUpdated = existingUser?.neynar_last_updated || null;

      // Determine if we should fetch (if never fetched OR fetched on a previous day)
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      let lastUpdateStr = null;
      if (neynarLastUpdated) {
        lastUpdateStr = new Date(neynarLastUpdated).toISOString().split('T')[0];
      }

      const shouldFetch = !lastUpdateStr || lastUpdateStr !== todayStr;

      // 2. Fetch Neynar Score if needed
      if (shouldFetch && process.env.NEYNAR_API_KEY) {
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
                    neynarLastUpdated = new Date().toISOString(); // Update timestamp
                }
            }
        } catch (e) {
            console.warn("Failed to fetch Neynar score", e);
        }
      }

      // 3. Upsert user (Split into Write and Read to fix Rank calculation bug)
      // We use COALESCE for primary_address to ensure we don't overwrite an existing address with NULL
      // if the client sends a sync request without the address (e.g. before wallet connect).
      const upsertResult = await pool.sql`
        INSERT INTO users (fid, username, pfp_url, score, streak, neynar_score, neynar_last_updated, primary_address)
        VALUES (${fid}, ${username}, ${pfpUrl}, 0, 0, ${neynarScore}, ${neynarLastUpdated}, ${primaryAddress || null})
        ON CONFLICT (fid) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          pfp_url = EXCLUDED.pfp_url,
          neynar_score = EXCLUDED.neynar_score,
          neynar_last_updated = EXCLUDED.neynar_last_updated,
          primary_address = COALESCE(EXCLUDED.primary_address, users.primary_address),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const user = upsertResult.rows[0];

      // 4. Calculate Rank in a separate query to ensure consistency
      const rankResult = await pool.sql`
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE score > ${user.score} 
           OR (score = ${user.score} AND updated_at < ${user.updated_at})
           OR (score = ${user.score} AND updated_at = ${user.updated_at} AND fid < ${user.fid})
      `;

      return response.status(200).json({
        ...user,
        rank: parseInt(rankResult.rows[0].rank)
      });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}