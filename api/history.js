
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    // Idempotent schema updates for rewards logic
    await pool.sql`
      ALTER TABLE contracts 
      ADD COLUMN IF NOT EXISTS fee numeric(18, 0) DEFAULT 0 CHECK (fee >= 0);
    `;
    await pool.sql`
      ALTER TABLE contracts 
      ADD COLUMN IF NOT EXISTS stream_percent integer DEFAULT 0 CHECK (stream_percent >= 0 AND stream_percent <= 100);
    `;

    if (request.method === 'GET') {
      const result = await pool.sql`
        SELECT MAX(day_number) as last_day FROM days;
      `;
      return response.status(200).json({ lastDay: result.rows[0].last_day || 0 });
    }

    if (request.method === 'POST') {
      const { day_number, player_count, target_address } = request.body;
      
      if (day_number === undefined || player_count === undefined || !target_address) {
        return response.status(400).json({ error: 'Missing required fields' });
      }

      // Check if already exists to avoid duplication and double-claiming
      const check = await pool.sql`
        SELECT 1 FROM days WHERE day_number = ${day_number}
      `;

      if (check.rowCount === 0) {
        // 1. Log the day in history
        await pool.sql`
          INSERT INTO days (day_number, player_count, target_address)
          VALUES (${day_number}, ${player_count}, ${target_address})
        `;

        // 2. Reward Distribution Logic
        // Fetch the latest contract params
        const contractRes = await pool.sql`
          SELECT fee, stream_percent, unit_price 
          FROM contracts 
          ORDER BY version DESC LIMIT 1
        `;
        
        const contract = contractRes.rows[0];
        
        if (contract && parseFloat(contract.fee) > 0 && contract.stream_percent > 0) {
          try {
            const feeWei = BigInt(contract.fee);
            const players = BigInt(player_count);
            const percent = BigInt(contract.stream_percent);
            const unitPrice = parseFloat(contract.unit_price);

            // Formula: (fee * players * percent / 100) / 1e18 * unit_price
            // Use BigInt for precision in Wei calculations
            const totalStreamWei = (feeWei * players * percent) / 100n;
            
            // Convert to ETH (float) and then to USD
            const streamEth = Number(totalStreamWei) / 1e18;
            const rewardUsd = streamEth * unitPrice;

            if (rewardUsd > 0) {
              // Add rewards to the user whose primary_address matches target_address
              // Using LOWER() for case-insensitive address matching
              const updateRes = await pool.sql`
                UPDATE users 
                SET rewards = rewards + ${rewardUsd}, updated_at = CURRENT_TIMESTAMP
                WHERE LOWER(primary_address) = LOWER(${target_address})
                RETURNING fid;
              `;
              
              if (updateRes.rowCount > 0) {
                console.log(`Success: $${rewardUsd.toFixed(4)} rewarded to FID ${updateRes.rows[0].fid} for Day ${day_number}`);
              } else {
                console.log(`Notice: Reward $${rewardUsd.toFixed(4)} calculated for ${target_address} but no matching user found.`);
              }
            }
          } catch (calcError) {
            console.error("Reward calculation/distribution failed:", calcError);
          }
        }

        return response.status(200).json({ success: true, action: 'inserted' });
      }

      return response.status(200).json({ success: true, action: 'skipped' });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}
