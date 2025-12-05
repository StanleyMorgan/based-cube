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
    const todayStr = now.toISOString().split('T')[0];
    
    // Check if already clicked today
    let lastClickStr = null;
    if (user.last_click_date) {
        lastClickStr = new Date(user.last_click_date).toISOString().split('T')[0];
    }

    if (lastClickStr === todayStr) {
       return response.status(400).json({ error: 'Already clicked today' });
    }

    // Calculate Streak
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (lastClickStr === yesterdayStr) {
      newStreak = user.streak + 1;
    }

    // Calculate Power
    const neynarScore = user.neynar_score || 0;
    const basePower = Math.floor(100 * neynarScore);
    const streakBonus = Math.min(newStreak, 30);
    const clickPower = basePower + streakBonus;
    
    const newScore = user.score + clickPower;

    // 2. Update DB (Split into Write and Read to fix Rank calculation bug)
    const updateResult = await pool.sql`
      UPDATE users 
      SET 
        score = ${newScore},
        streak = ${newStreak},
        last_click_date = ${todayStr},
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