
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

    // Security: Validate version and map to table name
    const getTableName = (v) => {
        const ver = parseInt(v) || 1;
        // Limit to known versions to prevent SQL injection or accidents
        if (ver === 1) return 'days_t1';
        if (ver === 2) return 'days_t2';
        return 'days_t1';
    };

    if (request.method === 'GET') {
      const version = request.query.version || 1;
      const tableName = getTableName(version);
      
      // Since tableName is dynamically constructed from validated input, we can safely use template literal 
      // but Postgres driver usually doesn't allow table names as parameters.
      // We will perform an idempotent check and rename 'days' to 'days_t1' if needed once.
      try {
          await pool.query('ALTER TABLE days RENAME TO days_t1;');
          await pool.query('CREATE TABLE IF NOT EXISTS days_t2 (LIKE days_t1 INCLUDING ALL);');
          
          // Ensure fee column exists in history tables
          await pool.query('ALTER TABLE days_t1 ADD COLUMN IF NOT EXISTS fee numeric(18, 0) DEFAULT 0;');
          await pool.query('ALTER TABLE days_t2 ADD COLUMN IF NOT EXISTS fee numeric(18, 0) DEFAULT 0;');
      } catch(e) { /* Already renamed or existing */ }

      const result = await pool.query(`SELECT MAX(day_number) as last_day FROM ${tableName}`);
      return response.status(200).json({ lastDay: result.rows[0].last_day || 0 });
    }

    if (request.method === 'POST') {
      const { day_number, player_count, target_address, fee, version = 1 } = request.body;
      const tableName = getTableName(version);
      
      if (day_number === undefined || player_count === undefined || !target_address) {
        return response.status(400).json({ error: 'Missing required fields' });
      }

      // Check if already exists in specific tier table
      const check = await pool.query(`SELECT 1 FROM ${tableName} WHERE day_number = $1`, [day_number]);

      if (check.rowCount === 0) {
        // 1. Log the day in specific tier history with fee
        await pool.query(`
          INSERT INTO ${tableName} (day_number, player_count, target_address, fee)
          VALUES ($1, $2, $3, $4)
        `, [day_number, player_count, target_address, fee || 0]);

        // 2. Reward Distribution Logic
        // Fetch contract params for THIS EXACT version
        const contractRes = await pool.sql`
          SELECT fee, stream_percent, unit_price 
          FROM contracts 
          WHERE version = ${version}
        `;
        
        const contract = contractRes.rows[0];
        
        // Use fee from request if provided, otherwise fallback to contract setting
        const effectiveFee = fee || (contract ? contract.fee : 0);
        
        if (contract && parseFloat(effectiveFee) > 0 && contract.stream_percent > 0) {
          try {
            const feeWei = BigInt(effectiveFee);
            const players = BigInt(player_count);
            const percent = BigInt(contract.stream_percent);
            const unitPrice = parseFloat(contract.unit_price);

            // Formula: (fee * players * percent / 100) / 1e18 * unit_price
            const totalStreamWei = (feeWei * players * percent) / 100n;
            
            // Convert to ETH (float) and then to USD
            const streamEth = Number(totalStreamWei) / 1e18;
            const rewardUsd = streamEth * unitPrice;

            if (rewardUsd > 0) {
              // Add rewards to the user
              const updateRes = await pool.sql`
                UPDATE users 
                SET rewards = rewards + ${rewardUsd}, updated_at = CURRENT_TIMESTAMP
                WHERE LOWER(primary_address) = LOWER(${target_address})
                RETURNING fid;
              `;
              
              if (updateRes.rowCount > 0) {
                console.log(`Success Tier ${version}: $${rewardUsd.toFixed(4)} rewarded to FID ${updateRes.rows[0].fid} for Day ${day_number}`);
              } else {
                console.log(`Notice Tier ${version}: Reward $${rewardUsd.toFixed(4)} calculated for ${target_address} but no matching user found.`);
              }
            }
          } catch (calcError) {
            console.error(`Reward calculation/distribution Tier ${version} failed:`, calcError);
          }
        }

        return response.status(200).json({ success: true, action: 'inserted', tier: version });
      }

      return response.status(200).json({ success: true, action: 'skipped', tier: version });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}
