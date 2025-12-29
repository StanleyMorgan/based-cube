
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
        console.error("❌ Webhook Error: Missing payload or header in body");
        return response.status(400).json({ error: 'Invalid JFS format' });
    }

    // 2. Decode Header to get FID
    let fid;
    try {
        const headerBuffer = Buffer.from(body.header, 'base64url');
        const decodedHeader = JSON.parse(headerBuffer.toString());
        fid = decodedHeader.fid;
        console.log(`[Webhook] Signer FID: ${fid}`);
    } catch (e) {
        console.error("❌ Webhook Error: Failed to decode header", e);
        return response.status(400).json({ error: 'Invalid header format' });
    }

    if (!fid) {
        console.error("❌ Webhook Error: FID not found in header");
        return response.status(400).json({ error: 'FID required' });
    }

    // 3. Decode Payload to get Event data
    let decodedPayload;
    try {
        const payloadBuffer = Buffer.from(body.payload, 'base64url');
        decodedPayload = JSON.parse(payloadBuffer.toString());
        console.log(`[Webhook] Full Payload:`, JSON.stringify(decodedPayload, null, 2));
    } catch (e) {
        console.error("❌ Webhook Error: Failed to decode payload", e);
        return response.status(400).json({ error: 'Invalid payload format' });
    }

    const { event, notificationDetails } = decodedPayload;

    // 4. Handle Events (Supporting both modern miniapp_* and legacy frame_* event names)
    const isAddEvent = event === 'miniapp_added' || event === 'frame_added' || event === 'notifications_enabled';
    const isRemoveEvent = event === 'miniapp_removed' || event === 'frame_removed' || event === 'notifications_disabled';

    if (isAddEvent) {
        console.log(`[Webhook] Processing ADD event: ${event} for FID: ${fid}`);
        if (notificationDetails) {
            const { token, url } = notificationDetails;
            console.log(`[Webhook] Storing Token for FID ${fid}: tokenPrefix=${token.substring(0, 5)}... url=${url}`);
            
            try {
                const result = await pool.sql`
                    INSERT INTO notification_tokens (fid, token, url, updated_at)
                    VALUES (${fid}, ${token}, ${url}, NOW())
                    ON CONFLICT (fid) 
                    DO UPDATE SET 
                        token = EXCLUDED.token, 
                        url = EXCLUDED.url,
                        updated_at = NOW()
                    RETURNING *;
                `;
                console.log(`✅ Webhook Success: Token stored/updated for FID ${fid}. Row count: ${result.rowCount}`);
            } catch (dbError) {
                console.error(`❌ Webhook DB Error during insert for FID ${fid}:`, dbError);
                throw dbError;
            }
        } else {
            console.warn(`⚠️ Webhook Warning: Event ${event} received but notificationDetails is MISSING for FID ${fid}. This happens if the user hasn't explicitly enabled notifications yet or the client hasn't generated a token.`);
        }
    } else if (isRemoveEvent) {
        console.log(`[Webhook] Processing REMOVE event: ${event} for FID: ${fid}`);
        try {
            const result = await pool.sql`
                DELETE FROM notification_tokens WHERE fid = ${fid};
            `;
            console.log(`🗑️ Webhook Success: Token removed for FID ${fid}. Rows deleted: ${result.rowCount}`);
        } catch (dbError) {
            console.error(`❌ Webhook DB Error during delete for FID ${fid}:`, dbError);
            throw dbError;
        }
    } else {
        console.log(`[Webhook] Unhandled event type: ${event}`);
    }

    // Always return 200 OK to the Farcaster client
    return response.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ Webhook Fatal Error:", error);
    return response.status(500).json({ error: error.message });
  }
}
