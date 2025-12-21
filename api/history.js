
import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
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

      // Check if already exists to avoid duplication
      const check = await pool.sql`
        SELECT 1 FROM days WHERE day_number = ${day_number}
      `;

      if (check.rowCount === 0) {
        await pool.sql`
          INSERT INTO days (day_number, player_count, target_address)
          VALUES (${day_number}, ${player_count}, ${target_address})
        `;
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
