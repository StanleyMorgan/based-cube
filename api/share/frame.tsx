
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const fid = url.searchParams.get('fid');
    const score = url.searchParams.get('score');

    // Define the origin
    const host = req.headers.get('host');
    const origin = host ? `https://${host}` : 'https://tesseract-base.vercel.app';

    // Image URL points to our generator with optional score for caching
    // We use &amp; for HTML safety when injecting into attributes
    const rawImageUrl = `${origin}/api/share/image?fid=${fid}${score ? `&score=${score}` : ''}`;
    const htmlSafeImageUrl = rawImageUrl.replace(/&/g, '&amp;');
    
    // App Launch URL (with referral)
    let appUrl = `${origin}/`;
    if (fid) {
        appUrl += `?ref=${fid}`;
    }

    // Using local logo
    const logoUrl = `${origin}/logo.png`;

    // MiniApp embed metadata
    const miniAppEmbed = {
      version: '1',
      imageUrl: rawImageUrl, // JSON uses raw URL
      button: {
        title: 'Play Tesseract',
        action: {
          type: 'launch_miniapp',
          name: 'Tesseract',
          url: appUrl,
          splashImageUrl: logoUrl,
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

    // We use single quotes for content attributes in HTML to keep JSON clean
    const miniAppContent = JSON.stringify(miniAppEmbed);
    const frameContent = JSON.stringify(frameEmbed);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Tesseract Share</title>
        <meta property="og:title" content="Tesseract" />
        <meta property="og:image" content='${htmlSafeImageUrl}' />
        <meta name="fc:miniapp" content='${miniAppContent}' />
        <meta name="fc:frame" content='${frameContent}' />
        
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
        'Cache-Control': 'public, max-age=0',
      },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate frame`, { status: 500 });
  }
}
