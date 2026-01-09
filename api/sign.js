
import { createPool } from '@vercel/postgres';
import { createWalletClient, http, encodePacked, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const pool = createPool({
    connectionString: process.env.cube_POSTGRES_URL,
  });

  try {
    const { fid, address } = request.body;
    if (!fid || !address) {
      return response.status(400).json({ error: 'FID and address are required' });
    }

    // 1. Get user score from DB
    const userRes = await pool.sql`SELECT score, version FROM users WHERE fid = ${fid}`;
    if (userRes.rows.length === 0) {
      return response.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    const points = user.score;
    
    // 2. Prepare Signature Data
    // Logic matches block.timestamp / 1 days in Solidity
    const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    
    // Signer setup
    const privateKey = process.env.SIGNER_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('SIGNER_PRIVATE_KEY not configured');
    }
    
    const account = privateKeyToAccount(privateKey);
    
    // 3. Generate ECDSA Signature
    // Message: keccak256(abi.encodePacked(msg.sender, signedPoints, signedDay))
    const hash = keccak256(
        encodePacked(
            ['address', 'uint256', 'uint256'],
            [address, BigInt(points), BigInt(currentDay)]
        )
    );
    
    // signMessage adds the "\x19Ethereum Signed Message:\n32" prefix
    const signature = await account.signMessage({
        message: { raw: hash }
    });

    return response.status(200).json({
        points,
        day: currentDay,
        signature
    });

  } catch (error) {
    console.error("Signing error:", error);
    return response.status(500).json({ error: error.message });
  }
}
