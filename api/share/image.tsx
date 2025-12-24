
import { ImageResponse } from '@vercel/og';
import { createPool } from '@vercel/postgres';

export const config = {
  runtime: 'edge', 
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const fid = url.searchParams.get('fid');
    const origin = url.origin; // Get the current domain (e.g., https://tesseract-base.vercel.app or http://localhost:3000)

    if (!fid) {
      return new Response('FID is required', { status: 400 });
    }

    // Connect to DB to get user stats
    const pool = createPool({
      connectionString: process.env.cube_POSTGRES_URL,
    });

    // Get user and rank
    const result = await pool.sql`
        SELECT username, score, pfp_url, rewards,
        (
          SELECT COUNT(*) + 1 
          FROM users u2 
          WHERE u2.score > u1.score 
             OR (u2.score = u1.score AND u2.updated_at < u1.updated_at)
             OR (u2.score = u1.score AND u2.updated_at = u1.updated_at AND u2.fid < u1.fid)
        ) as rank
        FROM users u1 
        WHERE fid = ${fid};
    `;

    if (result.rows.length === 0) {
       return new Response('User not found', { status: 404 });
    }

    const user = result.rows[0];
    const username = user.username || 'Player';
    const score = user.score.toLocaleString();
    const rank = `#${user.rank}`;
    const pfpUrl = user.pfp_url;
    const rewardsValue = parseFloat(user.rewards || 0);

    // Load font locally from the same origin
    // Add { cache: 'force-cache' } to ensure the Edge Function caches the font file
    const fontData = await fetch(new URL('/Inter-Bold.ttf', origin), { cache: 'force-cache' }).then((res) => res.arrayBuffer());

    // Use a local background image
    const bgImage = `${origin}/background.png`;

    return new ImageResponse(
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
          {/* Content Container */}
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
            {/* Avatar */}
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

                    {rewardsValue > 0 && (
                      <div style={{ display: 'flex', width: '2px', height: '80px', backgroundColor: '#334155', margin: '0 30px' }}></div>
                    )}

                    {rewardsValue > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', fontSize: '24px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rewards</div>
                          <div style={{ display: 'flex', fontSize: '64px', color: '#38bdf8', fontWeight: 700, lineHeight: 1 }}>{`$${rewardsValue.toFixed(2)}`}</div>
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
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
