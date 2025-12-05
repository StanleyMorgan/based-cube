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

    // Transaction to ensure data integrity
    // 1. Get current user state
    const userResult = await pool.sql`SELECT * FROM users WHERE fid = ${fid}`;
    
    if (userResult.rows.length === 0) {
      return response.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Check if already clicked today
    // Note: dates from Postgres might be Date objects
    let lastClickStr = null;
    if (user.last_click_date) {
        lastClickStr = new Date(user.last_click_date).toISOString().split('T')[0];
    }

    if (lastClickStr === todayStr) {
       return response.status(400).json({ error: 'Already clicked today' });
    }

    // Calculate Streak
    // Logic: If last click was yesterday (today - 1 day), increment streak. Else reset to 1.
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (lastClickStr === yesterdayStr) {
      newStreak = user.streak + 1;
    }

    // Calculate Power
    // Formula: floor(100 * Neynar Score) + min(streak, 30)
    const neynarScore = user.neynar_score || 0;
    const basePower = Math.floor(100 * neynarScore);
    const streakBonus = Math.min(newStreak, 30);
    const clickPower = basePower + streakBonus;
    
    const newScore = user.score + clickPower;

    // Update DB and calculate new rank with tie-breaker
    const updateResult = await pool.sql`
      UPDATE users 
      SET 
        score = ${newScore},
        streak = ${newStreak},
        last_click_date = ${todayStr},
        updated_at = CURRENT_TIMESTAMP
      WHERE fid = ${fid}
      RETURNING *, 
      (
        SELECT COUNT(*) + 1 
        FROM users u2 
        WHERE u2.score > users.score 
           OR (u2.score = users.score AND u2.updated_at < users.updated_at)
      ) as rank;
    `;

    return response.status(200).json(updateResult.rows[0]);

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}