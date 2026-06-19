const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ error: 'Missing email or verification code' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');

    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.verified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    if (user.verificationCode !== code.trim()) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Code matches, update user
    await users.updateOne(
      { _id: user._id },
      { 
        $set: { verified: true },
        $unset: { verificationCode: "" }
      }
    );

    return res.status(200).json({ success: true, email: user.email, username: user.username });
  } catch (err) {
    console.error('[/api/verify] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
