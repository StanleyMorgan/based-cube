import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    const { page = 1, limit = 20 } = request.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    // Rank logic: Score higher OR (Score equal AND Updated earlier) OR (Score equal AND Updated equal AND FID lower)
    const result = await pool.sql`
      SELECT fid, username, score, pfp_url, streak, last_click_date, neynar_score, referrer_fid,
      (
        SELECT COUNT(*) + 1 
        FROM users u2 
        WHERE u2.score > u1.score 
           OR (u2.score = u1.score AND u2.updated_at < u1.updated_at)
           OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)
      ) as rank,
      (
         CASE WHEN EXISTS (SELECT 1 FROM users ref WHERE ref.referrer_fid = u1.fid) THEN 1 ELSE 0 END
      ) as has_referrals
      FROM users u1
      ORDER BY score DESC, updated_at ASC, fid ASC
      LIMIT ${limitVal} OFFSET ${offset};
    `;
    
    const now = new Date();
    const windowEnd = 48 * 60 * 60 * 1000; // 48 hours

    const entries = result.rows.map(row => {
        // Team Score logic: +1 if has referrer, +2 if has referrals
        const invitedBySomeone = row.referrer_fid ? 1 : 0;
        const invitedOthers = row.has_referrals ? 2 : 0;
        const teamScore = invitedBySomeone + invitedOthers;

        // Effective Streak Logic (Visual only)
        let effectiveStreak = row.streak;
        if (row.last_click_date) {
            const lastClick = new Date(row.last_click_date);
            const diff = now.getTime() - lastClick.getTime();
            if (diff >= windowEnd) {
                effectiveStreak = 0;
            }
        } else {
             // If no last_click_date but has streak (edge case), reset to 0
             if (effectiveStreak > 0) effectiveStreak = 0;
        }

        return {
            id: row.fid.toString(),
            username: row.username,
            score: row.score,
            rank: parseInt(row.rank),
            pfpUrl: row.pfp_url,
            fid: row.fid,
            streak: effectiveStreak,
            neynarScore: row.neynar_score,
            teamScore: teamScore
        };
    });

    return response.status(200).json(entries);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}