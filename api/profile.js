const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { currentUser, newUsername } = req.body || {};

  if (!currentUser || !newUsername) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedCurrentUser = currentUser.trim().toLowerCase();
  const normalizedNewUsername = newUsername.trim().toLowerCase();

  if (normalizedNewUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  try {
    const db = await connectDB();
    const users = db.collection('users');

    // Make sure the new username isn't already taken
    if (normalizedCurrentUser !== normalizedNewUsername) {
      const existingUser = await users.findOne({ username: normalizedNewUsername });
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    // Since we now identify by either email or username, we'll try to find the user by either.
    // However, it's safer to find the user by their current session identifier.
    const user = await users.findOne({ 
      $or: [
        { username: normalizedCurrentUser },
        { email: normalizedCurrentUser }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { username: normalizedNewUsername } }
    );

    // Also update any completions that use this username
    // Wait, completions use the `userId` field. 
    // If the database uses `username` as `userId` in completions, we need to update those too.
    const completions = db.collection('completions');
    await completions.updateMany(
      { userId: normalizedCurrentUser },
      { $set: { userId: normalizedNewUsername } }
    );

    const habits = db.collection('habits');
    await habits.updateMany(
      { userId: normalizedCurrentUser },
      { $set: { userId: normalizedNewUsername } }
    );

    return res.status(200).json({ success: true, username: normalizedNewUsername });
  } catch (err) {
    console.error('[/api/profile] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
