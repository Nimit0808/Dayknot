const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { currentUser } = req.body || {};

  if (!currentUser) {
    return res.status(400).json({ error: 'Missing currentUser' });
  }

  const normalizedCurrentUser = currentUser.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');
    const habits = db.collection('habits');
    const completions = db.collection('completions');

    // Find the user to get their _id and actual username
    const user = await users.findOne({ 
      $or: [
        { username: normalizedCurrentUser },
        { email: normalizedCurrentUser }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userIdToClear = user.username || normalizedCurrentUser;

    // Delete habits and completions
    await habits.deleteMany({ userId: userIdToClear });
    await completions.deleteMany({ userId: userIdToClear });

    // Delete user
    await users.deleteOne({ _id: user._id });

    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('[/api/delete-account] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
