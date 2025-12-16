export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const fid = url.searchParams.get('fid');
    const score = url.searchParams.get('score');

    // New params from App.tsx
    const username = url.searchParams.get('u');
    const rank = url.searchParams.get('r');
    const pfp = url.searchParams.get('pfp');

    // Define the origin
    const host = req.headers.get('host');
    const origin = host ? `https://${host}` : 'https://tesseract-base.vercel.app';

    // Image URL points to our generator
    let imageUrl = `${origin}/api/share/image?fid=${fid}`;
    
    // Append parameters for Fast Path image generation
    if (score) imageUrl += `&score=${score}`;
    if (username) imageUrl += `&u=${encodeURIComponent(username)}`;
    if (rank) imageUrl += `&r=${rank}`;
    if (pfp) imageUrl += `&pfp=${encodeURIComponent(pfp)}`;
    
    // App Launch URL (with referral)
    let appUrl = `${origin}/`;
    if (fid) {
        appUrl += `?ref=${fid}`;
    }

    // MiniApp embed metadata
    const miniAppEmbed = {
      version: '1',
      imageUrl: imageUrl, // Dynamic image
      button: {
        title: 'Play Tesseract',
        action: {
          type: 'launch_miniapp',
          name: 'Tesseract',
          url: appUrl,
          splashImageUrl: 'https://raw.githubusercontent.com/StanleyMorgan/graphics/main/app/tesseract-base/logo.png',
          splashBackgroundColor: '#0f172a',
        },
      },
    };

    // Frame embed (backward compatibility)
    const frameEmbed = {
      ...miniAppEmbed,
      button: {
        ...miniAppEmbed.button,
        action: {
          ...miniAppEmbed.button.action,
          type: 'launch_frame',
        },
      },
    };

    const miniAppContent = JSON.stringify(miniAppEmbed).replace(/"/g, '&quot;');
    const frameContent = JSON.stringify(frameEmbed).replace(/"/g, '&quot;');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Tesseract Share</title>
        <meta property="og:title" content="Tesseract" />
        <meta property="og:image" content="${imageUrl}" />
        <meta name="fc:miniapp" content="${miniAppContent}" />
        <meta name="fc:frame" content="${frameContent}" />
        
        <!-- Redirect to app if opened in browser -->
        <meta http-equiv="refresh" content="0;url=${appUrl}" />
      </head>
      <body>
        <h1>Redirecting to Tesseract...</h1>
        <script>window.location.href = "${appUrl}";</script>
      </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0', // Do not cache the frame HTML itself aggressively
      },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate frame`, { status: 500 });
  }
}