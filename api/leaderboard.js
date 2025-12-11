import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    // Rank logic: Score higher OR (Score equal AND Updated earlier) OR (Score equal AND Updated equal AND FID lower)
    const result = await pool.sql`
      SELECT fid, username, score, pfp_url, streak, neynar_score, referrer_fid,
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
      LIMIT 50;
    `;
    
    const entries = result.rows.map(row => {
        // Team Score logic: +1 if has referrer, +2 if has referrals
        const invitedBySomeone = row.referrer_fid ? 1 : 0;
        const invitedOthers = row.has_referrals ? 2 : 0;
        const teamScore = invitedBySomeone + invitedOthers;

        return {
            id: row.fid.toString(),
            username: row.username,
            score: row.score,
            rank: parseInt(row.rank),
            pfpUrl: row.pfp_url,
            fid: row.fid,
            streak: row.streak,
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