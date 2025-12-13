import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Ensure table exists for storing tokens
    await pool.sql`
      CREATE TABLE IF NOT EXISTS notification_tokens (
        fid INTEGER PRIMARY KEY,
        token TEXT NOT NULL,
        url TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const payload = request.body;
    
    // In a production environment, you MUST verify the signature header 
    // "x-farcaster-signature" to ensure the request comes from Farcaster.
    // For this implementation, we focus on the logic.

    const { event, notificationDetails } = payload;
    
    // We need to decode the payload to get the FID (it's inside the signed payload)
    // However, the webhook body structure from Farcaster is usually:
    // { header: "...", payload: "...", signature: "..." }
    // We need to decode the base64 payload part to get the FID and event type.
    
    let decodedPayload;
    try {
        const payloadBuffer = Buffer.from(payload.payload, 'base64url');
        decodedPayload = JSON.parse(payloadBuffer.toString());
    } catch (e) {
        // If it's already JSON (some dev tools send raw JSON), handle gracefully or fail
        // Assuming standard signed message format here:
        console.error("Failed to decode webhook payload", e);
        return response.status(400).json({ error: 'Invalid payload format' });
    }

    const fid = decodedPayload.fid;
    const eventType = decodedPayload.event; // miniapp_added, notifications_enabled, etc.

    if (!fid) {
        return response.status(400).json({ error: 'FID not found in payload' });
    }

    // Handle Events
    if (eventType === 'miniapp_added' || eventType === 'notifications_enabled') {
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
            console.log(`Notification token stored for FID ${fid}`);
        }
    } else if (eventType === 'miniapp_removed' || eventType === 'notifications_disabled') {
        await pool.sql`
            DELETE FROM notification_tokens WHERE fid = ${fid};
        `;
        console.log(`Notification token removed for FID ${fid}`);
    }

    return response.status(200).json({ success: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return response.status(500).json({ error: error.message });
  }
}