const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { currentUser, code } = req.body || {};

  if (!currentUser || !code) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedCurrentUser = currentUser.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');

    const user = await users.findOne({ 
      $or: [
        { username: normalizedCurrentUser },
        { email: normalizedCurrentUser }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pendingEmail || !user.pendingEmailCode || !user.pendingEmailExpires) {
      return res.status(400).json({ error: 'No email change requested' });
    }

    if (new Date() > new Date(user.pendingEmailExpires)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    if (user.pendingEmailCode !== code.trim()) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    const newEmail = user.pendingEmail;

    // Update email and clear pending fields
    await users.updateOne(
      { _id: user._id },
      { 
        $set: { email: newEmail },
        $unset: { pendingEmail: "", pendingEmailCode: "", pendingEmailExpires: "" }
      }
    );

    return res.status(200).json({ success: true, email: newEmail });
  } catch (err) {
    console.error('[/api/change-email-verify] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
