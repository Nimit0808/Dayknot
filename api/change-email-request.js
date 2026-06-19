const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { currentUser, newEmail } = req.body || {};

  if (!currentUser || !newEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedCurrentUser = currentUser.trim().toLowerCase();
  const normalizedNewEmail = newEmail.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');

    // Check if the new email is already in use
    const existingUser = await users.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken' });
    }

    const user = await users.findOne({ 
      $or: [
        { username: normalizedCurrentUser },
        { email: normalizedCurrentUser }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate verification code
    const pendingEmailCode = Math.floor(100000 + Math.random() * 900000).toString();
    const pendingEmailExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          pendingEmail: normalizedNewEmail,
          pendingEmailCode,
          pendingEmailExpires
        }
      }
    );

    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Dayknot <onboarding@resend.dev>',
            to: [normalizedNewEmail],
            subject: 'Verify your new email on Dayknot',
            html: `<p>Your email verification code is: <strong>${pendingEmailCode}</strong></p><p>This code will expire in 15 minutes.</p>`
          })
        });
      } catch (e) {
        console.error('Failed to send verification email:', e);
      }
    } else {
      console.log(`[MOCK EMAIL] Change email verification code for ${normalizedNewEmail} is ${pendingEmailCode}`);
    }

    return res.status(200).json({ success: true, message: 'Verification code sent' });
  } catch (err) {
    console.error('[/api/change-email-request] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
