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
    
    // Check 5 minutes cooldown
    // Note: Database column last_click_date must be TIMESTAMP for this to work precisely
    if (user.last_click_date) {
        const lastClick = new Date(user.last_click_date);
        const diff = now.getTime() - lastClick.getTime();
        // DEBUG: 5 minutes cooldown
        const cooldown = 5 * 60 * 1000; 
        
        // Allow a small buffer (e.g. 5 seconds) to prevent edge case sync issues
        if (diff < (cooldown - 5000)) {
           return response.status(400).json({ error: 'Cooldown active' });
        }
    }

    // Calculate Streak
    // Streak logic: If last click was within (5m to 10m) window, increment. 
    // If > 10m, reset.
    let newStreak = 1;
    
    if (user.last_click_date) {
        const lastClick = new Date(user.last_click_date);
        const diff = now.getTime() - lastClick.getTime();
        
        // DEBUG: 5m window start, 10m window end
        const windowStart = 5 * 60 * 1000;
        const windowEnd = 10 * 60 * 1000;
        
        if (diff >= windowStart && diff < windowEnd) {
            // Maintained streak
            newStreak = user.streak + 1;
        } else if (diff >= windowEnd) {
            // Missed a day (window)
            newStreak = 1;
        } else {
             // Should not happen due to cooldown check, but if forced, keep streak
             newStreak = user.streak;
        }
    }

    // Calculate Power
    const neynarScore = user.neynar_score || 0;
    const basePower = Math.floor(100 * neynarScore);
    const streakBonus = Math.min(newStreak, 30);
    const clickPower = basePower + streakBonus;
    
    const newScore = user.score + clickPower;

    // 2. Update DB (Split into Write and Read to fix Rank calculation bug)
    // IMPORTANT: last_click_date is set to CURRENT_TIMESTAMP to capture exact time
    const updateResult = await pool.sql`
      UPDATE users 
      SET 
        score = ${newScore},
        streak = ${newStreak},
        last_click_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE fid = ${fid}
      RETURNING *;
    `;

    const updatedUser = updateResult.rows[0];

    // 3. Calculate Rank in a separate query
    const rankResult = await pool.sql`
      SELECT COUNT(*) + 1 as rank
      FROM users
      WHERE score > ${updatedUser.score} 
         OR (score = ${updatedUser.score} AND updated_at < ${updatedUser.updated_at})
         OR (score = ${updatedUser.score} AND updated_at = ${updatedUser.updated_at} AND fid < ${updatedUser.fid})
    `;

    return response.status(200).json({
      ...updatedUser,
      rank: parseInt(rankResult.rows[0].rank)
    });

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}