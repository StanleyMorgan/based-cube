import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    // Ensure table exists
    await pool.sql`
      CREATE TABLE IF NOT EXISTS score_history (
        id SERIAL PRIMARY KEY,
        fid INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        reason VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    if (request.method === 'GET') {
      const { fid, limit = 50 } = request.query;
      
      if (!fid) return response.status(400).json({ error: 'FID is required' });

      const result = await pool.sql`
        SELECT * FROM score_history 
        WHERE fid = ${fid} 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;

      return response.status(200).json(result.rows);
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: error.message });
  }
}