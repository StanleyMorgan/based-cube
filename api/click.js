import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid } = request.body;
    if (!fid) return response.status(400).json({ error: 'FID is required' });

    // Transaction to ensure data integrity
    // 1. Get current user state
    const userResult = await sql`SELECT * FROM users WHERE fid = ${fid}`;
    
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
    const power = 100 + ((newStreak - 1) * 10); // Using new streak - 1 because power is based on *previous* streak in original logic, or we can just adapt. 
    // Let's stick to: streak 0 (first day) -> 100. streak 1 (2nd day) -> 110.
    // Original logic: 100 + (streak * 10). If streak resets to 1, power is 110? 
    // Let's standardise: Base 100. Every day adds 10.
    
    const clickPower = 100 + ((newStreak - 1) * 10);
    const newScore = user.score + clickPower;

    // Update DB
    const updateResult = await sql`
      UPDATE users 
      SET 
        score = ${newScore},
        streak = ${newStreak},
        last_click_date = ${todayStr},
        updated_at = CURRENT_TIMESTAMP
      WHERE fid = ${fid}
      RETURNING *, (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.score > users.score) as rank;
    `;

    return response.status(200).json(updateResult.rows[0]);

  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}