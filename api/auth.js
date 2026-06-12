// POST /api/auth
// Body: { action: 'login' | 'signup', username: string, passwordHash: string }
// The password is already SHA-256 hashed by the client before being sent.

const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, username, passwordHash } = req.body || {};

  if (!action || !username || !passwordHash) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedUsername = username.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');

    if (action === 'signup') {
      const existing = await users.findOne({ username: normalizedUsername });
      if (existing) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      await users.insertOne({
        _id: normalizedUsername,
        username: normalizedUsername,
        passwordHash,
        createdAt: new Date(),
      });
      return res.status(200).json({ success: true, username: normalizedUsername });
    }

    if (action === 'login') {
      const user = await users.findOne({ username: normalizedUsername });
      if (!user || user.passwordHash !== passwordHash) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      return res.status(200).json({ success: true, username: normalizedUsername });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('[/api/auth] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
