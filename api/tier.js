import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, version } = request.body;
    if (!fid || version === undefined) return response.status(400).json({ error: 'Missing data' });

    // 1. Get current user
    const userRes = await pool.sql`SELECT tier_updatable, score, updated_at FROM users WHERE fid = ${fid}`;
    if (userRes.rows.length === 0) return response.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];
    const now = new Date();
    const updatable = new Date(user.tier_updatable);

    if (now < updatable) {
        return response.status(400).json({ error: 'Tier is locked' });
    }

    // 2. Update Tier
    const updateRes = await pool.sql`
        UPDATE users 
        SET 
            version = ${version},
            tier_updatable = CURRENT_TIMESTAMP + INTERVAL '24 hours',
            updated_at = CURRENT_TIMESTAMP
        WHERE fid = ${fid}
        RETURNING *;
    `;

    const updatedUser = updateRes.rows[0];
    
    // Fetch contract details
    const contractRes = await pool.sql`SELECT contract_address, stream_percent, unit_price FROM contracts WHERE version = ${updatedUser.version}`;
    const stats = contractRes.rows[0];

    // Calculate Rank
    const rankResult = await pool.sql`
      SELECT COUNT(*) + 1 as rank
      FROM users
      WHERE fid != ${fid} AND (
        score > ${updatedUser.score} 
         OR (score = ${updatedUser.score} AND updated_at > ${updatedUser.updated_at})
         OR (score = ${updatedUser.score} AND updated_at = ${updatedUser.updated_at} AND fid < ${updatedUser.fid})
      )
    `;

    return response.status(200).json({
        ...updatedUser,
        rank: parseInt(rankResult.rows[0].rank),
        tierUpdatable: updatedUser.tier_updatable,
        contractAddress: stats?.contract_address,
        streamPercent: stats?.stream_percent || 0,
        unitPrice: parseFloat(stats?.unit_price || 0),
        rewards: parseFloat(updatedUser.rewards || 0),
        actualRewards: parseFloat(updatedUser.actual_rewards || updatedUser.rewards || 0)
    });

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}