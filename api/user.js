import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
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

      // Get user, rank, and team score logic + Team Avatars
      // 1. referrer_pfp: PFP of the person who invited this user
      // 2. referral_pfps: PFPs of top 3 people this user invited (by Neynar score)
      const result = await pool.sql`
        SELECT *, 
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.score > u1.score 
             OR (u2.score = u1.score AND u2.updated_at < u1.updated_at)
             OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)
        ) as rank,
        (
             (CASE WHEN referrer_fid IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN EXISTS (SELECT 1 FROM users u_inv WHERE u_inv.referrer_fid = u1.fid) THEN 2 ELSE 0 END)
        ) as team_score,
        (
            SELECT pfp_url FROM users u_ref WHERE u_ref.fid = u1.referrer_fid
        ) as referrer_pfp,
        (
            SELECT ARRAY_AGG(pfp_url) 
            FROM (
                SELECT pfp_url 
                FROM users u_sub 
                WHERE u_sub.referrer_fid = u1.fid 
                ORDER BY u_sub.neynar_score DESC 
                LIMIT 3
            ) sub
        ) as referral_pfps
        FROM users u1 
        WHERE fid = ${fid};
      `;

      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'User not found' });
      }
      
      const user = result.rows[0];
      const effectiveStreak = getEffectiveStreak(user);

      // Construct team members array: [referrer, ...referrals] (max 3 total)
      const teamMembers = [];
      if (user.referrer_pfp) teamMembers.push(user.referrer_pfp);
      if (user.referral_pfps && Array.isArray(user.referral_pfps)) {
          teamMembers.push(...user.referral_pfps);
      }
      // Slice to max 3 just in case
      const finalTeamMembers = teamMembers.slice(0, 3);

      return response.status(200).json({
        ...user,
        streak: effectiveStreak,
        teamScore: parseInt(user.team_score),
        teamMembers: finalTeamMembers
      });
    }

    if (request.method === 'POST') {
      const { fid, username, pfpUrl, primaryAddress, referrerFid } = request.body;
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      // 1. Check existing user data to determine if we need to fetch Neynar Score
      const existingUserRes = await pool.sql`
        SELECT neynar_score, neynar_last_updated, referrer_fid
        FROM users 
        WHERE fid = ${fid}
      `;
      
      const existingUser = existingUserRes.rows[0];
      
      let neynarScore = existingUser?.neynar_score || 0;
      let neynarLastUpdated = existingUser?.neynar_last_updated || null;

      // Determine if we should fetch (if never fetched OR fetched on a previous day)
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      let lastUpdateStr = null;
      if (neynarLastUpdated) {
        lastUpdateStr = new Date(neynarLastUpdated).toISOString().split('T')[0];
      }

      const shouldFetch = !lastUpdateStr || lastUpdateStr !== todayStr;

      // 2. Fetch Neynar Score if needed
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
                    neynarScore = data.users[0]?.experimental?.neynar_user_score || 0;
                    neynarLastUpdated = new Date().toISOString(); // Update timestamp
                }
            }
        } catch (e) {
            console.warn("Failed to fetch Neynar score", e);
        }
      }

      // 3. Upsert user
      let referrerValue = referrerFid ? referrerFid : null;

      // Prevent self-referral
      if (referrerValue && String(referrerValue) === String(fid)) {
        referrerValue = null;
      }

      const upsertResult = await pool.sql`
        INSERT INTO users (fid, username, pfp_url, score, streak, neynar_score, neynar_last_updated, primary_address, referrer_fid)
        VALUES (${fid}, ${username}, ${pfpUrl || null}, 0, 0, ${neynarScore}, ${neynarLastUpdated}, ${primaryAddress || null}, ${referrerValue})
        ON CONFLICT (fid) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          pfp_url = COALESCE(EXCLUDED.pfp_url, users.pfp_url),
          neynar_score = EXCLUDED.neynar_score,
          neynar_last_updated = EXCLUDED.neynar_last_updated,
          primary_address = COALESCE(EXCLUDED.primary_address, users.primary_address),
          -- Critical Fix: Prioritize existing referrer_fid in DB over new value
          referrer_fid = COALESCE(users.referrer_fid, EXCLUDED.referrer_fid),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const user = upsertResult.rows[0];

      // 4. Calculate Rank, Team Score AND Team Members
      const statsResult = await pool.sql`
        SELECT 
          (
            SELECT COUNT(*) + 1
            FROM users
            WHERE score > ${user.score} 
               OR (score = ${user.score} AND updated_at < ${user.updated_at})
               OR (score = ${user.score} AND updated_at = ${user.updated_at} AND fid < ${user.fid})
          ) as rank,
          (
            CASE WHEN EXISTS (SELECT 1 FROM users WHERE referrer_fid = ${user.fid}) THEN 1 ELSE 0 END
          ) as has_referrals,
          (
            SELECT pfp_url FROM users u_ref WHERE u_ref.fid = ${user.referrer_fid}
          ) as referrer_pfp,
          (
            SELECT ARRAY_AGG(pfp_url) 
            FROM (
                SELECT pfp_url 
                FROM users u_sub 
                WHERE u_sub.referrer_fid = ${user.fid} 
                ORDER BY u_sub.neynar_score DESC 
                LIMIT 3
            ) sub
          ) as referral_pfps
      `;

      const stats = statsResult.rows[0];
      const rank = parseInt(stats.rank);
      const hasReferrals = parseInt(stats.has_referrals) === 1;

      // Team Score Logic
      const invitedBySomeone = user.referrer_fid ? 1 : 0;
      const invitedOthers = hasReferrals ? 2 : 0;
      const teamScore = invitedBySomeone + invitedOthers;

      // Team Members Logic
      const teamMembers = [];
      if (stats.referrer_pfp) teamMembers.push(stats.referrer_pfp);
      if (stats.referral_pfps && Array.isArray(stats.referral_pfps)) {
          teamMembers.push(...stats.referral_pfps);
      }
      const finalTeamMembers = teamMembers.slice(0, 3);

      // 5. Look up Referrer Address
      let referrerAddress = null;
      if (user.referrer_fid) {
          const referrerRes = await pool.sql`
            SELECT primary_address FROM users WHERE fid = ${user.referrer_fid}
          `;
          if (referrerRes.rows.length > 0) {
              referrerAddress = referrerRes.rows[0].primary_address;
          }
      }
      
      const effectiveStreak = getEffectiveStreak(user);

      return response.status(200).json({
        ...user,
        streak: effectiveStreak,
        rank,
        teamScore,
        referrerAddress,
        teamMembers: finalTeamMembers
      });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}