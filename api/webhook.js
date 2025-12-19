
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Webhook received!"); // Log to check that Warpcast sees the URL

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
    
    // Log raw body for debugging (be careful with PII in prod)
    // console.log("Raw body:", JSON.stringify(body));

    if (!body || !body.payload) {
        console.error("Missing payload in body");
        return response.status(400).json({ error: 'Invalid body' });
    }

    // Decode Payload
    let decodedPayload;
    try {
        const payloadBuffer = Buffer.from(body.payload, 'base64url');
        decodedPayload = JSON.parse(payloadBuffer.toString());
        console.log("Decoded Event:", decodedPayload.event, "FID:", decodedPayload.fid);
    } catch (e) {
        console.error("Failed to decode payload", e);
        return response.status(400).json({ error: 'Invalid payload format' });
    }

    const { fid, event } = decodedPayload;

    if (!fid) {
        return response.status(400).json({ error: 'FID not found' });
    }

    // Handle Events
    if (event === 'miniapp_added' || event === 'notifications_enabled') {
        if (decodedPayload.notificationDetails) {
            const { token, url } = decodedPayload.notificationDetails;
            
            await pool.sql`
                INSERT INTO notification_tokens (fid, token, url, updated_at)
                VALUES (${fid}, ${token}, ${url}, NOW())
                ON CONFLICT (fid) 
                DO UPDATE SET 
                    token = EXCLUDED.token, 
                    url = EXCLUDED.url,
                    updated_at = NOW();
            `;
            console.log(`✅ Token stored for FID ${fid}`);
        } else {
            console.log(`⚠️ Event ${event} received but no notificationDetails found.`);
        }
    } else if (event === 'miniapp_removed' || event === 'notifications_disabled') {
        await pool.sql`
            DELETE FROM notification_tokens WHERE fid = ${fid};
        `;
        console.log(`🗑️ Token removed for FID ${fid}`);
    }

    return response.status(200).json({ success: true });

  } catch (error) {
    console.error("Server Error in Webhook:", error);
    return response.status(500).json({ error: error.message });
  }
}
