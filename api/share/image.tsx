
import { ImageResponse } from '@vercel/og';
import { createPool } from '@vercel/postgres';
import { createClient } from '@vercel/kv';

// Explicitly create the KV client to ensure it picks up the correct environment variables
// manual creation is more robust for Marketplace integrations.
const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export const config = {
  runtime: 'edge', 
};

export default async function handler(req: Request) {
  const startTime = performance.now();
  
  try {
    const url = new URL(req.url);
    const fid = url.searchParams.get('fid');
    const score = url.searchParams.get('score');
    const origin = url.origin;

    if (!fid) {
      return new Response('FID is required', { status: 400 });
    }

    // 1. Redis Cache Check
    if (score && process.env.KV_REST_API_URL) {
      const cacheKey = `img_v1:${fid}:${score}`;
      try {
        const cachedBase64 = await kv.get<string>(cacheKey);
        if (cachedBase64) {
          // In Edge runtime, this is the most compatible way to decode base64 to bytes
          const binaryString = atob(cachedBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          console.log(`[ShareImage Cache Hit] FID: ${fid} | Score: ${score}`);
          return new Response(bytes, {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
              'X-Cache': 'HIT'
            },
          });
        }
      } catch (kvError) {
        console.warn('[Redis Error] Continuing without cache:', kvError);
      }
    }

    // 2. Profile Database (Cache Miss or No Score)
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
    const currentScore = user.score;
    const rankNum = `#${user.rank}`;
    const pfpUrl = user.pfp_url;
    const rewardsValue = parseFloat(user.rewards || 0);
    const neynarPower = (user.neynar_score || 0).toFixed(2);

    // Process team members for avatars
    const teamMembers = [];
    if (user.referrer_data) teamMembers.push(user.referrer_data);
    if (user.referral_data && Array.isArray(user.referral_data)) {
        teamMembers.push(...user.referral_data);
    }
    const finalTeamMembers = teamMembers.slice(0, 3);

    // 3. Profile Font Loading
    const fontData = await fetch(new URL('/Inter-Bold.ttf', origin), { cache: 'force-cache' }).then((res) => res.arrayBuffer());

    const bgImage = `${origin}/background.jpg`;

    // 4. Profile Image Generation
    const genStart = performance.now();
    const imageResponse = new ImageResponse(
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
                        <div style={{ display: 'flex', fontSize: '64px', color: '#ffffff', fontWeight: 700, lineHeight: 1 }}>{rankNum}</div>
                    </div>
                    
                    <div style={{ display: 'flex', width: '2px', height: '80px', backgroundColor: '#334155', margin: '0 30px' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Neynar</div>
                        <div style={{ display: 'flex', fontSize: '64px', color: '#38bdf8', fontWeight: 700, lineHeight: 1 }}>{neynarPower}</div>
                    </div>

                    <div style={{ display: 'flex', width: '2px', height: '80px', backgroundColor: '#334155', margin: '0 30px' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team</div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', height: '64px' }}>
                            {finalTeamMembers.length > 0 ? (
                                finalTeamMembers.map((member: any, i: number) => (
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
                                            objectFit: 'cover'
                                        }}
                                    />
                                ))
                            ) : (
                                <div style={{ display: 'flex', fontSize: '56px', color: '#475569', fontWeight: 700, lineHeight: 1 }}>-</div>
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
      },
    );

    // 5. Store in Redis for future requests
    if (score && process.env.KV_REST_API_URL) {
      const imageBuffer = await imageResponse.arrayBuffer();
      const cacheKey = `img_v1:${fid}:${currentScore}`;
      
      try {
        const base64String = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        await kv.set(cacheKey, base64String, { ex: 86400 }); // Cache for 24 hours
        
        const genEnd = performance.now();
        console.log(`[ShareImage Miss] FID: ${fid} | Score: ${currentScore} | Saved to Cache | Total: ${(genEnd - startTime).toFixed(2)}ms`);

        return new Response(imageBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
            'X-Cache': 'MISS'
          },
        });
      } catch (kvError) {
        console.warn('[Redis Save Error]:', kvError);
      }
    }

    return imageResponse;

  } catch (e: any) {
    console.error(`[ShareImage Error]`, e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
