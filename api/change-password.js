const { connectDB } = require('./_mongodb');

// This uses the same hash logic as the frontend but we compare on the backend
// Wait, the frontend sends passwordHash for auth, so we'll expect currentPasswordHash and newPasswordHash
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { currentUser, currentPasswordHash, newPasswordHash } = req.body || {};

  if (!currentUser || !currentPasswordHash || !newPasswordHash) {
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

    if (!user.passwordHash) {
      // User signed up with Google and has no password set
      return res.status(400).json({ error: 'Account uses Google Sign-In and has no password.' });
    }

    if (user.passwordHash !== currentPasswordHash) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { passwordHash: newPasswordHash } }
    );

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[/api/change-password] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
