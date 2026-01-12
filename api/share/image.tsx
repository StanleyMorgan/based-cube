
import { ImageResponse } from '@vercel/og';
import { createPool } from '@vercel/postgres';

export const config = {
  runtime: 'edge', 
};

export default async function handler(req: Request) {
  const startTime = performance.now();
  
  try {
    const url = new URL(req.url);
    const fid = url.searchParams.get('fid');
    const mode = url.searchParams.get('mode'); // 'power' or default (rank)
    const origin = url.origin;

    if (!fid) {
      return new Response('FID is required', { status: 400 });
    }

    const pool = createPool({
      connectionString: process.env.cube_POSTGRES_URL,
    });

    const isPowerMode = mode === 'power';

    // 1. Database Fetch
    const dbStart = performance.now();
    let result;
    
    if (isPowerMode) {
      // Detailed stats for Power Card
      result = await pool.sql`
        SELECT u1.username, u1.score, u1.pfp_url, u1.rewards, u1.actual_rewards, u1.streak, u1.neynar_score, u1.neynar_power_change, u1.referrer_fid,
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.fid != u1.fid AND (
            u2.score > u1.score 
             OR (u2.score = u1.score AND u2.updated_at > u1.updated_at)
             OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)
          )
        ) as rank,
        (
          CASE WHEN EXISTS (SELECT 1 FROM users WHERE referrer_fid = u1.fid) THEN 1 ELSE 0 END
        ) as has_referrals
        FROM users u1 
        WHERE fid = ${fid};
      `;
    } else {
      // Basic data for Rank Card
      result = await pool.sql`
        SELECT username, score, pfp_url, rewards,
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.fid != u1.fid AND (
            u2.score > u1.score 
             OR (u2.score = u1.score AND u2.updated_at > u1.updated_at)
             OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)
          )
        ) as rank
        FROM users u1 
        WHERE fid = ${fid};
      `;
    }
    const dbEnd = performance.now();

    if (result.rows.length === 0) {
       return new Response('User not found', { status: 404 });
    }

    const user = result.rows[0];
    const username = user.username || 'Player';
    const score = user.score.toLocaleString();
    const rank = `#${user.rank}`;
    const pfpUrl = user.pfp_url;
    
    // Power stats
    const neynarPower = Math.round((user.neynar_score || 0) * 100);
    const neynarPowerChange = user.neynar_power_change || 0;
    const streakPower = Math.min(user.streak || 0, 30);
    const teamPower = (user.referrer_fid ? 1 : 0) + (user.has_referrals ? 2 : 0);
    const earnedRewards = parseFloat(user.actual_rewards || user.rewards || 0);

    // 2. Font Loading
    const fontStart = performance.now();
    const fontData = await fetch(new URL('/Inter-Bold.ttf', origin), { cache: 'force-cache' }).then((res) => res.arrayBuffer());
    const fontEnd = performance.now();

    const bgImage = `${origin}/background.jpg`;

    // Render Logic
    const genStart = performance.now();
    
    let content;
    if (isPowerMode) {
      // Power Card View (Mimics PlayerStatsModal)
      content = (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#020617', // slate-950
            backgroundImage: `url(${bgImage})`,
            backgroundSize: '100% 100%',
            fontFamily: '"Inter"',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#0f172a', // slate-900
              borderRadius: '48px',
              border: '2px solid #334155', // slate-700
              padding: '60px',
              width: '800px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
                <div style={{ position: 'relative', display: 'flex', marginBottom: '20px' }}>
                    {pfpUrl ? (
                        <img
                            src={pfpUrl}
                            style={{
                                width: '160px',
                                height: '160px',
                                borderRadius: '50%',
                                border: '8px solid #334155',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        <div style={{ width: '160px', height: '160px', borderRadius: '50%', backgroundColor: '#334155', border: '8px solid #475569' }}></div>
                    )}
                    <div style={{ 
                        position: 'absolute', 
                        bottom: '-10px', 
                        right: '-10px', 
                        backgroundColor: '#1e293b', 
                        color: 'white', 
                        fontSize: '24px', 
                        fontWeight: 700, 
                        padding: '8px 16px', 
                        borderRadius: '999px',
                        border: '2px solid #475569'
                    }}>
                        {rank}
                    </div>
                </div>
                <div style={{ fontSize: '48px', fontWeight: 800, color: 'white' }}>{username}</div>
            </div>

            {/* Stats Block */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                width: '100%', 
                backgroundColor: 'rgba(30, 41, 59, 0.5)', 
                borderRadius: '40px', 
                border: '1px solid rgba(71, 85, 105, 0.5)',
                overflow: 'hidden'
            }}>
                {/* Neynar Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 40px', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#38bdf8' }}>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>Neynar</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {neynarPowerChange !== 0 && (
                            <div style={{ fontSize: '28px', fontWeight: 700, marginRight: '20px', color: neynarPowerChange > 0 ? '#34d399' : '#f87171' }}>
                                {neynarPowerChange > 0 ? `+${neynarPowerChange}` : neynarPowerChange}
                            </div>
                        )}
                        <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>+{neynarPower}</div>
                    </div>
                </div>

                {/* Streak Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 40px', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#fb923c' }}>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>Streak</div>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>+{streakPower}</div>
                </div>

                {/* Team Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 40px', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#818cf8' }}>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>Team</div>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>+{teamPower}</div>
                </div>

                {/* Earned Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#34d399' }}>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>Earned</div>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: 'white' }}>${earnedRewards.toFixed(2)}</div>
                </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Original Rank Card View
      content = (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingBottom: '100px',
            backgroundColor: '#0f172a',
            backgroundImage: `url(${bgImage})`,
            backgroundSize: '100% 100%',
            fontFamily: '"Inter"',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '24px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '40px',
              boxShadow: '0 0 60px rgba(0,0,0,0.5)',
            }}
          >
            {pfpUrl && (
                <img
                    src={pfpUrl}
                    style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        border: '4px solid #38bdf8',
                        marginRight: '40px',
                        objectFit: 'cover',
                    }}
                />
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: '32px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>
                    {`${username}`}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</div>
                        <div style={{ display: 'flex', fontSize: '64px', color: '#ffffff', fontWeight: 700, lineHeight: 1 }}>{rank}</div>
                    </div>
                    
                    <div style={{ display: 'flex', width: '2px', height: '80px', backgroundColor: '#334155', margin: '0 30px' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                        <div style={{ display: 'flex', fontSize: '64px', color: '#38bdf8', fontWeight: 700, lineHeight: 1 }}>{score}</div>
                    </div>

                    {earnedRewards > 0 && (
                      <div style={{ display: 'flex', width: '2px', height: '80px', backgroundColor: '#334155', margin: '0 30px' }}></div>
                    )}

                    {earnedRewards > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rewards</div>
                          <div style={{ display: 'flex', fontSize: '64px', color: '#38bdf8', fontWeight: 700, lineHeight: 1 }}>{`$${earnedRewards.toFixed(2)}`}</div>
                      </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      );
    }

    const response = new ImageResponse(content,
      {
        width: 1200,
        height: 800,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
        headers: {
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        },
      },
    );
    const genEnd = performance.now();
    const totalTime = genEnd - startTime;

    console.log(`[ShareImage ${mode || 'Rank'}] FID: ${fid} | Total: ${totalTime.toFixed(2)}ms | DB: ${(dbEnd - dbStart).toFixed(2)}ms | Font: ${(fontEnd - fontStart).toFixed(2)}ms | RenderInit: ${(genEnd - genStart).toFixed(2)}ms`);

    return response;
  } catch (e: any) {
    console.error(`[ShareImage Error]`, e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
