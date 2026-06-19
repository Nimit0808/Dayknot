const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code, newPasswordHash } = req.body || {};

  if (!email || !code || !newPasswordHash) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');

    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'Invalid or expired code' });
    }

    if (!user.resetCode || !user.resetExpires) {
      return res.status(400).json({ error: 'No password reset requested' });
    }

    if (new Date() > new Date(user.resetExpires)) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    if (user.resetCode !== code.trim()) {
      return res.status(401).json({ error: 'Invalid reset code' });
    }

    // Update password and clear reset fields
    await users.updateOne(
      { _id: user._id },
      { 
        $set: { passwordHash: newPasswordHash },
        $unset: { resetCode: "", resetExpires: "" }
      }
    );

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[/api/password-reset] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
