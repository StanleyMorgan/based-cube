
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    const { targetAddress, collectedFeeWei } = request.body;
    
    if (!targetAddress || collectedFeeWei === undefined) {
      return response.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure actual_rewards column exists
    await pool.sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS actual_rewards NUMERIC(20,2) DEFAULT 0;
    `;

    // 1. Fetch user's historical rewards and their SPECIFIC contract version settings
    const dataRes = await pool.sql`
      SELECT 
        c.stream_percent,
        c.unit_price,
        u.rewards
      FROM users u
      LEFT JOIN contracts c ON c.version = u.version
      WHERE LOWER(u.primary_address) = LOWER(${targetAddress})
      LIMIT 1;
    `;
    
    const row = dataRes.rows[0];

    if (!row) {
      return response.status(200).json({ success: false, message: 'Target user not found in DB' });
    }

    const feeWei = BigInt(collectedFeeWei);
    const percent = BigInt(row.stream_percent || 0);
    const unitPrice = parseFloat(row.unit_price || 0);
    const previousRewards = parseFloat(row.rewards || 0);

    // 2. Calculate Live Reward USD: (Wei * % / 100) / 1e18 * unitPrice
    const currentRewardWei = (feeWei * percent) / 100n;
    const currentRewardUsd = (Number(currentRewardWei) / 1e18) * unitPrice;

    // 3. Sum previous + current and update actual_rewards
    const totalActualRewards = previousRewards + currentRewardUsd;

    await pool.sql`
      UPDATE users 
      SET actual_rewards = ${totalActualRewards.toFixed(2)}, updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(primary_address) = LOWER(${targetAddress});
    `;

    return response.status(200).json({ 
      success: true, 
      actualRewards: totalActualRewards 
    });

  } catch (error) {
    console.error("Sync rewards error:", error);
    return response.status(500).json({ error: error.message });
  }
}
