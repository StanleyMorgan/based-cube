
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    const { page = 1, limit = 20, sort = 'score' } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    const isRewardsSort = sort === 'rewards';
    
    // Determine Order By and Rank Calculation based on sort parameter
    const orderBy = isRewardsSort 
      ? `rewards DESC, score DESC, updated_at ASC` 
      : `score DESC, updated_at ASC, fid ASC`;

    const rankCondition = isRewardsSort
      ? `u2.rewards > u1.rewards OR (u2.rewards = u1.rewards AND u2.score > u1.score) OR (u2.rewards = u1.rewards AND u2.score = u1.score AND u2.updated_at < u1.updated_at)`
      : `u2.score > u1.score OR (u2.score = u1.score AND u2.updated_at < u1.updated_at) OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)`;

    const result = await pool.sql`
      SELECT u1.fid, u1.username, u1.score, u1.rewards, u1.pfp_url, u1.streak, u1.last_click_date, u1.neynar_score, u1.neynar_power_change, u1.referrer_fid, u1.primary_address,
      (
        SELECT COUNT(*) + 1 
        FROM users u2 
        WHERE ${rankCondition}
      ) as rank,
      (
         CASE WHEN EXISTS (SELECT 1 FROM users ref WHERE ref.referrer_fid = u1.fid) THEN 1 ELSE 0 END
      ) as has_referrals,
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
      ORDER BY ${orderBy}
      LIMIT ${limitVal} OFFSET ${offset};
    `;
    
    const now = new Date();
    const windowEnd = 48 * 60 * 60 * 1000; // 48 hours

    const entries = result.rows.map(row => {
        const invitedBySomeone = row.referrer_fid ? 1 : 0;
        const invitedOthers = row.has_referrals ? 2 : 0;
        const teamScore = invitedBySomeone + invitedOthers;

        let effectiveStreak = row.streak;
        if (row.last_click_date) {
            const lastClick = new Date(row.last_click_date);
            const diff = now.getTime() - lastClick.getTime();
            if (diff >= windowEnd) {
                effectiveStreak = 0;
            }
        } else {
             if (effectiveStreak > 0) effectiveStreak = 0;
        }

        const teamMembers = [];
        if (row.referrer_data) teamMembers.push(row.referrer_data);
        if (row.referral_data && Array.isArray(row.referral_data)) {
            teamMembers.push(...row.referral_data);
        }
        const finalTeamMembers = teamMembers.slice(0, 3);

        return {
            id: row.fid.toString(),
            username: row.username,
            score: row.score,
            rewards: parseFloat(row.rewards || 0),
            rank: parseInt(row.rank),
            pfpUrl: row.pfp_url,
            fid: row.fid,
            streak: effectiveStreak,
            neynarScore: row.neynar_score,
            neynarPowerChange: row.neynar_power_change || 0,
            teamScore: teamScore,
            teamMembers: finalTeamMembers,
            primaryAddress: row.primary_address
        };
    });

    return response.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}
