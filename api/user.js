
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    // Ensure the column exists (Idempotent)
    await pool.sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS neynar_power_change INTEGER DEFAULT 0;
    `;
    await pool.sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
    `;
    await pool.sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stream_target BOOLEAN DEFAULT false;
    `;
    await pool.sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS rewards NUMERIC(20,2) DEFAULT 0;
    `;

    // Helper to calculate effective streak based on time
    const getEffectiveStreak = (user) => {
        if (!user.last_click_date) return user.streak;
        
        const lastClick = new Date(user.last_click_date);
        const now = new Date();
        const diff = now.getTime() - lastClick.getTime();
        const windowEnd = 48 * 60 * 60 * 1000; // 48 hours
        
        if (diff >= windowEnd) {
            return 0;
        }
        return user.streak;
    };

    if (request.method === 'GET') {
      const { fid } = request.query;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // Get user, rank, and team score logic + Team Avatars (as JSON objects)
      const result = await pool.sql`
        SELECT u1.*, 
        c.contract_address, c.stream_percent, c.unit_price,
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.score > u1.score 
             OR (u2.score = u1.score AND u2.updated_at < u1.updated_at)
             OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)
        ) as rank,
        (
             (CASE WHEN u1.referrer_fid IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN EXISTS (SELECT 1 FROM users u_inv WHERE u_inv.referrer_fid = u1.fid) THEN 2 ELSE 0 END)
        ) as team_score,
        (
            SELECT json_build_object('fid', fid, 'pfpUrl', pfp_url) 
            FROM users u_ref WHERE u_ref.fid = u1.referrer_fid
        ) as referrer_data,
        (
            SELECT json_agg(json_build_object('fid', fid, 'pfpUrl', pfp_url)) 
            FROM (
                SELECT fid, pfp_url 
                FROM users u_sub 
                WHERE u_sub.referrer_fid = u1.fid 
                ORDER BY u_sub.neynar_score DESC 
                LIMIT 3
            ) sub
        ) as referral_data
        FROM users u1 
        LEFT JOIN contracts c ON c.version = u1.version
        WHERE u1.fid = ${fid};
      `;

      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'User not found' });
      }
      
      const user = result.rows[0];
      const effectiveStreak = getEffectiveStreak(user);

      // Construct team members array: [referrer, ...referrals] (max 3 total)
      const teamMembers = [];
      if (user.referrer_data) teamMembers.push(user.referrer_data);
      if (user.referral_data && Array.isArray(user.referral_data)) {
          teamMembers.push(...user.referral_data);
      }
      const finalTeamMembers = teamMembers.slice(0, 3);

      return response.status(200).json({
        ...user,
        streak: effectiveStreak,
        teamScore: parseInt(user.team_score),
        teamMembers: finalTeamMembers,
        neynarPowerChange: user.neynar_power_change || 0,
        contractAddress: user.contract_address,
        streamPercent: user.stream_percent || 0,
        unitPrice: parseFloat(user.unit_price || 0),
        stream_target: user.stream_target,
        rewards: user.rewards || 0
      });
    }

    if (request.method === 'POST') {
      const { fid, username, pfpUrl, primaryAddress, referrerFid } = request.body;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // 1. Check existing user data...
      const existingUserRes = await pool.sql`
        SELECT neynar_score, neynar_last_updated, referrer_fid, neynar_power_change, stream_target, rewards
        FROM users 
        WHERE fid = ${fid}
      `;
      
      const existingUser = existingUserRes.rows[0];
      
      let neynarScore = existingUser?.neynar_score || 0;
      let neynarLastUpdated = existingUser?.neynar_last_updated || null;
      let neynarPowerChange = existingUser?.neynar_power_change || 0;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      let lastUpdateStr = null;
      if (neynarLastUpdated) {
        lastUpdateStr = new Date(neynarLastUpdated).toISOString().split('T')[0];
      }

      const shouldFetch = !lastUpdateStr || lastUpdateStr !== todayStr;

      // 2. Fetch Neynar Score if needed...
      if (shouldFetch && process.env.NEYNAR_API_KEY) {
        try {
            const neynarRes = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
                headers: { 
                    'api_key': process.env.NEYNAR_API_KEY,
                    'accept': 'application/json'
                }
            });
            if (neynarRes.ok) {
                const data = await neynarRes.json();
                if (data.users && data.users.length > 0) {
                    const newScore = data.users[0]?.experimental?.neynar_user_score || 0;
                    
                    // Calculate change in Power (Neynar Score * 100)
                    // Use Math.round to handle precision errors (0.57 * 100 = 57)
                    const oldPower = Math.round((existingUser?.neynar_score || 0) * 100);
                    const newPower = Math.round(newScore * 100);
                    
                    neynarPowerChange = newPower - oldPower;
                    
                    neynarScore = newScore;
                    neynarLastUpdated = new Date().toISOString(); 
                }
            }
        } catch (e) {
            console.warn("Failed to fetch Neynar score", e);
        }
      }

      // 3. Upsert user
      let referrerValue = referrerFid ? referrerFid : null;
      if (referrerValue && String(referrerValue) === String(fid)) {
        referrerValue = null;
      }

      const upsertResult = await pool.sql`
        INSERT INTO users (fid, username, pfp_url, score, streak, neynar_score, neynar_last_updated, primary_address, referrer_fid, neynar_power_change, rewards)
        VALUES (${fid}, ${username}, ${pfpUrl || null}, 0, 0, ${neynarScore}, ${neynarLastUpdated}, ${primaryAddress || null}, ${referrerValue}, ${neynarPowerChange}, 0)
        ON CONFLICT (fid) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          pfp_url = COALESCE(EXCLUDED.pfp_url, users.pfp_url),
          neynar_score = EXCLUDED.neynar_score,
          neynar_last_updated = EXCLUDED.neynar_last_updated,
          neynar_power_change = EXCLUDED.neynar_power_change,
          primary_address = COALESCE(EXCLUDED.primary_address, users.primary_address),
          referrer_fid = COALESCE(users.referrer_fid, EXCLUDED.referrer_fid),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const userRaw = upsertResult.rows[0];

      // 4. Calculate Rank, Team Score AND Team Members (JSON objects)
      const statsResult = await pool.sql`
        SELECT 
          c.contract_address, c.stream_percent, c.unit_price,
          (
            SELECT COUNT(*) + 1
            FROM users
            WHERE score > ${userRaw.score} 
               OR (score = ${userRaw.score} AND updated_at < ${userRaw.updated_at})
               OR (score = ${userRaw.score} AND updated_at = ${userRaw.updated_at} AND fid < ${userRaw.fid})
          ) as rank,
          (
            CASE WHEN EXISTS (SELECT 1 FROM users WHERE referrer_fid = ${userRaw.fid}) THEN 1 ELSE 0 END
          ) as has_referrals,
          (
            SELECT json_build_object('fid', fid, 'pfpUrl', pfp_url) 
            FROM users u_ref WHERE u_ref.fid = ${userRaw.referrer_fid}
          ) as referrer_data,
          (
            SELECT json_agg(json_build_object('fid', fid, 'pfpUrl', pfp_url)) 
            FROM (
                SELECT fid, pfp_url 
                FROM users u_sub 
                WHERE u_sub.referrer_fid = ${userRaw.fid} 
                ORDER BY u_sub.neynar_score DESC 
                LIMIT 3
            ) sub
          ) as referral_data
        FROM contracts c
        WHERE c.version = ${userRaw.version}
        LIMIT 1;
      `;

      const stats = statsResult.rows[0];
      const rank = parseInt(stats.rank);
      const hasReferrals = parseInt(stats.has_referrals) === 1;

      const invitedBySomeone = userRaw.referrer_fid ? 1 : 0;
      const invitedOthers = hasReferrals ? 2 : 0;
      const teamScore = invitedBySomeone + invitedOthers;

      const teamMembers = [];
      if (stats.referrer_data) teamMembers.push(stats.referrer_data);
      if (stats.referral_data && Array.isArray(stats.referral_data)) {
          teamMembers.push(...stats.referral_data);
      }
      const finalTeamMembers = teamMembers.slice(0, 3);

      let referrerAddress = null;
      if (userRaw.referrer_fid) {
          const referrerRes = await pool.sql`
            SELECT primary_address FROM users WHERE fid = ${userRaw.referrer_fid}
          `;
          if (referrerRes.rows.length > 0) {
              referrerAddress = referrerRes.rows[0].primary_address;
          }
      }
      
      const effectiveStreak = getEffectiveStreak(userRaw);

      return response.status(200).json({
        ...userRaw,
        streak: effectiveStreak,
        rank,
        teamScore,
        referrerAddress,
        teamMembers: finalTeamMembers,
        neynarPowerChange: userRaw.neynar_power_change || 0,
        contractAddress: stats.contract_address,
        streamPercent: stats.stream_percent || 0,
        unitPrice: parseFloat(stats.unit_price || 0),
        stream_target: userRaw.stream_target,
        rewards: userRaw.rewards || 0
      });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}
