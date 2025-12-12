
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
    
    if (request.method === 'GET') {
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      const result = await pool.sql`
        SELECT task_id FROM user_tasks WHERE fid = ${fid}
      `;
      
      const completedIds = result.rows.map(r => r.task_id);
      return response.status(200).json({ completedIds });
    }

    if (request.method === 'POST') {
      // action can be 'verify' or 'claim'
      const { fid, taskId, action } = request.body;
      if (!fid || !taskId) return response.status(400).json({ error: 'Missing data' });

      // -- Verification Helper --
      const checkVerification = async () => {
        if (taskId === 'invite_friend') {
             // Check if user has referred anyone
             const refCheck = await pool.sql`
                 SELECT 1 FROM users WHERE referrer_fid = ${fid} LIMIT 1
             `;
             return refCheck.rowCount > 0;
        }
        if (taskId === 'follow_stmorgan') {
            // Implicit trust for now as we rely on client action for following (or need expensive API call)
            // You can add Neynar API check here if you have the key
            return true; 
        }
        return false;
      };

      // 1. Handle Verify Action (Does not claim, just checks)
      if (action === 'verify') {
          const isVerified = await checkVerification();
          return response.status(200).json({ verified: isVerified });
      }

      // 2. Handle Claim Action (Default if action is missing for backward compat)
      if (!action || action === 'claim') {
          
          // Re-verify before claiming to be safe
          const isVerified = await checkVerification();
          if (!isVerified) {
              return response.status(400).json({ error: 'Task requirements not met' });
          }

          // Transaction: Insert Task + Update User Score
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

          // Add Reward (10 points)
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
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}