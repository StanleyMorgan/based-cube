
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid } = request.body;
    if (!fid) return response.status(400).json({ error: 'FID is required' });

    // 1. Get current user state
    const userResult = await pool.sql`SELECT * FROM users WHERE fid = ${fid}`;
    
    if (userResult.rows.length === 0) {
      return response.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const now = new Date();
    
    // Check 24 hours cooldown
    if (user.last_click_date) {
        const lastClick = new Date(user.last_click_date);
        const diff = now.getTime() - lastClick.getTime();
        const cooldown = 24 * 60 * 60 * 1000; 
        
        if (diff < (cooldown - 5000)) {
           return response.status(400).json({ error: 'Cooldown active' });
        }
    }

    // Calculate Streak
    let newStreak = 1;
    
    if (user.last_click_date) {
        const lastClick = new Date(user.last_click_date);
        const diff = now.getTime() - lastClick.getTime();
        
        const windowStart = 24 * 60 * 60 * 1000;
        const windowEnd = 48 * 60 * 60 * 1000;
        
        if (diff >= windowStart && diff < windowEnd) {
            newStreak = user.streak + 1;
        } else if (diff >= windowEnd) {
            newStreak = 1;
        } else {
             newStreak = user.streak;
        }
    }

    // Calculate Team Bonus
    // Optimization: We don't need COUNT(*), we just need to know if at least ONE exists.
    // Using LIMIT 1 is much faster for users with many referrals.
    const referralResult = await pool.sql`SELECT 1 FROM users WHERE referrer_fid = ${fid} LIMIT 1`;
    const hasReferrals = referralResult.rows.length > 0;
    
    const invitedBySomeone = user.referrer_fid ? 1 : 0;
    const invitedOthers = hasReferrals ? 2 : 0;
    const teamBonus = invitedBySomeone + invitedOthers;

    // Calculate Power
    const neynarScore = user.neynar_score || 0;
    // Use Math.round to handle precision (0.57 * 100 = 57)
    const basePower = Math.round(100 * neynarScore);
    const streakBonus = Math.min(newStreak, 30);
    
    // Total Power
    const clickPower = basePower + streakBonus + teamBonus;
    
    const newScore = user.score + clickPower;

    // 2. Update DB
    const updateResult = await pool.sql`
      UPDATE users 
      SET 
        score = ${newScore},
        streak = ${newStreak},
        last_click_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE fid = ${fid}
      RETURNING *, (SELECT contract_address FROM contracts WHERE version = users.version LIMIT 1) as contract_address;
    `;

    const updatedUser = updateResult.rows[0];

    // 3. Calculate Rank
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
      teamScore: teamBonus,
      contractAddress: updatedUser.contract_address,
      rewards: parseFloat(updatedUser.rewards || 0),
      actualRewards: parseFloat(updatedUser.actual_rewards || updatedUser.rewards || 0)
    });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}
