const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { credential } = req.body || {};

  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }

  try {
    // Verify the Google ID Token by calling Google's tokeninfo endpoint
    // This is safe because Google verifies the signature and returns the payload if valid.
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const payload = await googleRes.json();
    
    // Ensure the token was issued to our Client ID
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      return res.status(401).json({ error: 'Token was not issued for this app' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name;
    const picture = payload.picture;
    const googleId = payload.sub;

    const db = await connectDB();
    const users = db.collection('users');

    // Find if user already exists
    let user = await users.findOne({ email });

    if (user) {
      // If user exists but doesn't have a googleId, link it
      if (!user.googleId) {
        await users.updateOne(
          { _id: user._id },
          { $set: { googleId, picture, verified: true } }
        );
      }
    } else {
      // User doesn't exist, create them
      // Use their Google name as their username initially, but ensure it's unique
      let baseUsername = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (!baseUsername) baseUsername = 'user';
      if (baseUsername.length < 3) baseUsername += '123';
      
      let newUsername = baseUsername;
      let counter = 1;
      while (await users.findOne({ username: newUsername })) {
        newUsername = `${baseUsername}${counter}`;
        counter++;
      }

      user = {
        email,
        username: newUsername,
        googleId,
        picture,
        verified: true, // Google emails are already verified
        createdAt: new Date()
      };
      
      await users.insertOne(user);
    }

    // Since username is what the app uses for currentUser, we return it
    const returnUsername = user.username || user.email;

    return res.status(200).json({ 
      success: true, 
      username: returnUsername,
      email: user.email,
      picture: user.picture || picture
    });

  } catch (err) {
    console.error('[/api/auth-google] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
