
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
    const origin = url.origin;

    if (!fid) {
      return new Response('FID is required', { status: 400 });
    }

    // 1. Profile Database
    const dbStart = performance.now();
    const pool = createPool({
      connectionString: process.env.cube_POSTGRES_URL,
    });

    const result = await pool.sql`
        SELECT u1.username, u1.score, u1.pfp_url, u1.rewards, u1.neynar_score,
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
        WHERE u1.fid = ${fid};
    `;
    const dbEnd = performance.now();

    if (result.rows.length === 0) {
       return new Response('User not found', { status: 404 });
    }

    const user = result.rows[0];
    const username = user.username || 'Player';
    const rank = `#${user.rank}`;
    const pfpUrl = user.pfp_url;
    const rewardsValue = parseFloat(user.rewards || 0);
    const neynarPower = Math.round((user.neynar_score || 0) * 100);

    // Process team members for avatars
    const teamMembers = [];
    if (user.referrer_data) teamMembers.push(user.referrer_data);
    if (user.referral_data && Array.isArray(user.referral_data)) {
        teamMembers.push(...user.referral_data);
    }
    const finalTeamMembers = teamMembers.slice(0, 3);

    // 2. Profile Font Loading
    const fontStart = performance.now();
    const fontData = await fetch(new URL('/Inter-Bold.ttf', origin), { cache: 'force-cache' }).then((res) => res.arrayBuffer());
    const fontEnd = performance.now();

    const bgImage = `${origin}/background.jpg`;

    // 3. Profile Image Generation (Satori/Yoga layout + SVG generation)
    const genStart = performance.now();
    const response = new ImageResponse(
      (
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
                        <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Neynar</div>
                        <div style={{ display: 'flex', fontSize: '64px', color: '#38bdf8', fontWeight: 700, lineHeight: 1 }}>{`${neynarPower}`}</div>
                    </div>

                    <div style={{ display: 'flex', width: '2px', height: '80px', backgroundColor: '#334155', margin: '0 30px' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Team</div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            {finalTeamMembers.length > 0 ? (
                                finalTeamMembers.map((member: any, i) => (
                                    <img
                                        key={i}
                                        src={member.pfpUrl || `${origin}/logo.png`}
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            border: '1px solid #1e293b',
                                            marginLeft: i === 0 ? '0' : '-16px',
                                            backgroundColor: '#1e293b',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ))
                            ) : (
                                <div style={{ display: 'flex', fontSize: '56px', color: '#475569', fontWeight: 700 }}>-</div>
                            )}
                        </div>
                    </div>

                    {rewardsValue > 0 && (
                      <div style={{ display: 'flex', width: '2px', height: '80px', backgroundColor: '#334155', margin: '0 30px' }}></div>
                    )}

                    {rewardsValue > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rewards</div>
                          <div style={{ display: 'flex', fontSize: '64px', color: '#10b981', fontWeight: 700, lineHeight: 1 }}>{`$${rewardsValue.toFixed(2)}`}</div>
                      </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      ),
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

    console.log(`[ShareImage Profile] FID: ${fid} | Total: ${totalTime.toFixed(2)}ms | DB: ${(dbEnd - dbStart).toFixed(2)}ms | Font: ${(fontEnd - fontStart).toFixed(2)}ms | RenderInit: ${(genEnd - genStart).toFixed(2)}ms`);

    return response;
  } catch (e: any) {
    console.error(`[ShareImage Error]`, e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
