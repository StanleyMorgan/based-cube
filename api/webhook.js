
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Ensure table exists
    await pool.sql`
      CREATE TABLE IF NOT EXISTS notification_tokens (
        fid INTEGER PRIMARY KEY,
        token TEXT NOT NULL,
        url TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const body = request.body;
    
    if (!body || !body.payload || !body.header) {
        console.error("Missing payload or header in body");
        return response.status(400).json({ error: 'Invalid JFS format' });
    }

    // 2. Decode Header to get FID
    // Farcaster Signatures (JFS) store the signer's FID in the header
    let fid;
    try {
        const headerBuffer = Buffer.from(body.header, 'base64url');
        const decodedHeader = JSON.parse(headerBuffer.toString());
        fid = decodedHeader.fid;
        console.log("Webhook Signer FID:", fid);
    } catch (e) {
        console.error("Failed to decode header", e);
        return response.status(400).json({ error: 'Invalid header format' });
    }

    if (!fid) {
        console.error("FID not found in header");
        return response.status(400).json({ error: 'FID required' });
    }

    // 3. Decode Payload to get Event data
    let decodedPayload;
    try {
        const payloadBuffer = Buffer.from(body.payload, 'base64url');
        decodedPayload = JSON.parse(payloadBuffer.toString());
        console.log("Event Type:", decodedPayload.event);
    } catch (e) {
        console.error("Failed to decode payload", e);
        return response.status(400).json({ error: 'Invalid payload format' });
    }

    const { event, notificationDetails } = decodedPayload;

    // 4. Handle Events
    if (event === 'miniapp_added' || event === 'notifications_enabled') {
        if (notificationDetails) {
            const { token, url } = notificationDetails;
            
            await pool.sql`
                INSERT INTO notification_tokens (fid, token, url, updated_at)
                VALUES (${fid}, ${token}, ${url}, NOW())
                ON CONFLICT (fid) 
                DO UPDATE SET 
                    token = EXCLUDED.token, 
                    url = EXCLUDED.url,
                    updated_at = NOW();
            `;
            console.log(`✅ Token stored successfully for FID ${fid}`);
        } else {
            console.warn(`⚠️ Event ${event} received but notificationDetails is missing.`);
        }
    } else if (event === 'miniapp_removed' || event === 'notifications_disabled') {
        await pool.sql`
            DELETE FROM notification_tokens WHERE fid = ${fid};
        `;
        console.log(`🗑️ Token removed for FID ${fid}`);
    }

    // Always return 200 OK to the Farcaster client
    return response.status(200).json({ success: true });

  } catch (error) {
    console.error("Webhook Handler Error:", error);
    return response.status(500).json({ error: error.message });
  }
}
