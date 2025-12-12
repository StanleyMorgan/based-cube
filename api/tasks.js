
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    // 1. Ensure table exists (Idempotent)
    await pool.sql`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        fid INTEGER NOT NULL,
        task_id VARCHAR(50) NOT NULL,
        completed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(fid, task_id)
      );
    `;

    const { fid } = request.query; 
    // For POST, fid is in body usually, but let's handle both for safety or strictness below
    
    if (request.method === 'GET') {
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      const result = await pool.sql`
        SELECT task_id FROM user_tasks WHERE fid = ${fid}
      `;
      
      const completedIds = result.rows.map(r => r.task_id);
      return response.status(200).json({ completedIds });
    }

    if (request.method === 'POST') {
      const { fid, taskId } = request.body;
      if (!fid || !taskId) return response.status(400).json({ error: 'Missing data' });

      // Verification Logic
      if (taskId === 'invite_friend') {
        // Check if user has referred anyone
        const refCheck = await pool.sql`
            SELECT 1 FROM users WHERE referrer_fid = ${fid} LIMIT 1
        `;
        if (refCheck.rowCount === 0) {
            return response.status(400).json({ error: 'No referrals found. Invite a friend first!' });
        }
      }

      // If taskId is 'follow_stmorgan', we implicitly trust the client/SDK interaction 
      // for this iteration, as strict server-side follow checks require an indexer API key.

      // Transaction: Insert Task + Update User Score
      // We do this in two steps because Vercel Postgres doesn't support BEGIN/COMMIT blocks easily in single template literals without a client checkout,
      // but we can rely on constraints for safety.

      // 1. Insert Task (Will fail if already exists due to UNIQUE constraint)
      try {
        await pool.sql`
            INSERT INTO user_tasks (fid, task_id) VALUES (${fid}, ${taskId})
        `;
      } catch (e) {
          if (e.code === '23505') { // Unique violation
              return response.status(400).json({ error: 'Task already completed' });
          }
          throw e;
      }

      // 2. Add Reward (10 points)
      const reward = 10;
      const updateResult = await pool.sql`
        UPDATE users 
        SET score = score + ${reward}, updated_at = CURRENT_TIMESTAMP 
        WHERE fid = ${fid}
        RETURNING score;
      `;

      return response.status(200).json({ 
        success: true, 
        newScore: updateResult.rows[0].score 
      });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}
