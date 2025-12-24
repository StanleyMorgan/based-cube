
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

      // Fetch all active tasks and join with user_tasks to see if they are completed
      const result = await pool.sql`
        SELECT t.*, 
        CASE WHEN ut.fid IS NOT NULL THEN 'claimed' ELSE 'start' END as status
        FROM tasks t
        LEFT JOIN user_tasks ut ON ut.task_id = t.id AND ut.fid = ${fid}
        WHERE t.is_active = true
        ORDER BY t.created_at ASC;
      `;
      
      return response.status(200).json({ tasks: result.rows });
    }

    if (request.method === 'POST') {
      // action can be 'verify' or 'claim'
      const { fid, taskId, action } = request.body;
      if (!fid || !taskId) return response.status(400).json({ error: 'Missing data' });

      // Fetch task definition from DB
      const taskRes = await pool.sql`SELECT * FROM tasks WHERE id = ${taskId}`;
      if (taskRes.rows.length === 0) {
          return response.status(404).json({ error: 'Task definition not found' });
      }
      const task = taskRes.rows[0];

      // -- Verification Helper driven by Task Type --
      const checkVerification = async () => {
        if (task.type === 'REFERRAL') {
             // Check if user has referred anyone (matching target_id logic if needed, but default is any referral)
             const refCheck = await pool.sql`
                 SELECT 1 FROM users WHERE referrer_fid = ${fid} LIMIT 1
             `;
             return refCheck.rowCount > 0;
        }
        
        if (task.type === 'NEYNAR_FOLLOW') {
            const targetFid = task.target_id;
            if (!process.env.NEYNAR_API_KEY || !targetFid) return true; // Implicit trust if no key or id

            try {
                // Check if viewer_fid (current user) follows targetFid
                const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${targetFid}&viewer_fid=${fid}`, {
                    headers: { 'api_key': process.env.NEYNAR_API_KEY }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.users && data.users.length > 0) {
                        return data.users[0]?.viewer_context?.following === true;
                    }
                }
            } catch (e) {
                console.error("Neynar follow verify failed", e);
            }
            return true; // Fallback to implicit trust
        }

        if (task.type === 'NEYNAR_CAST') {
            const castHash = task.target_id;
            if (!process.env.NEYNAR_API_KEY || !castHash) return false;

            try {
                const res = await fetch(`https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash&viewer_fid=${fid}`, {
                    headers: { 'api_key': process.env.NEYNAR_API_KEY }
                });
                if (res.ok) {
                    const data = await res.json();
                    const vc = data.cast?.viewer_context;
                    return vc?.liked === true && vc?.recasted === true;
                }
            } catch (e) {
                console.error("Neynar task verify failed", e);
            }
            return false;
        }

        if (task.type === 'LINK') {
            // Links are verified by clicking (start -> verify bypasses check or user just clicks start)
            return true;
        }

        return false;
      };

      // 1. Handle Verify Action (Does not claim, just checks)
      if (action === 'verify') {
          const isVerified = await checkVerification();
          return response.status(200).json({ verified: isVerified });
      }

      // 2. Handle Claim Action
      if (!action || action === 'claim') {
          
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

          // Rewards logic - now dynamic from DB
          const reward = task.reward || 10;
          
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
