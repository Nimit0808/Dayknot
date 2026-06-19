// POST /api/auth
// Body: { action: 'login' | 'signup', email?: string, username?: string, passwordHash: string }
// The password is already SHA-256 hashed by the client before being sent.

const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, username, passwordHash } = req.body || {};

  try {
    const db = await connectDB();
    const users = db.collection('users');

    if (action === 'signup') {
      if (!email || !username || !passwordHash) return res.status(400).json({ error: 'Missing required fields' });
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();

      const existing = await users.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedUsername }] });
      if (existing) {
        if (existing.email === normalizedEmail) return res.status(409).json({ error: 'Email already registered' });
        return res.status(409).json({ error: 'Username already exists' });
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      await users.insertOne({
        _id: normalizedEmail,
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
        verified: false,
        verificationCode,
        createdAt: new Date(),
      });

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
              to: [normalizedEmail],
              subject: 'Verify your Dayknot account',
              html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`
            })
          });
        } catch (e) {
          console.error('Failed to send email:', e);
        }
      } else {
        console.log(`[MOCK EMAIL] Verification code for ${normalizedEmail} is ${verificationCode}`);
      }

      return res.status(200).json({ success: true, email: normalizedEmail, username: normalizedUsername, requiresVerification: true });
    }

    if (action === 'login') {
      const identifier = (email || username || '').trim().toLowerCase();
      if (!identifier || !passwordHash) return res.status(400).json({ error: 'Missing required fields' });

      const user = await users.findOne({ $or: [{ email: identifier }, { username: identifier }, { _id: identifier }] });
      
      if (!user || user.passwordHash !== passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.verified === false) {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        await users.updateOne({ _id: user._id }, { $set: { verificationCode: newCode } });
        
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
                to: [user.email],
                subject: 'Verify your Dayknot account',
                html: `<p>Your new verification code is: <strong>${newCode}</strong></p>`
              })
            });
          } catch(e) {}
        } else {
          console.log(`[MOCK EMAIL] New verification code for ${user.email} is ${newCode}`);
        }

        return res.status(403).json({ error: 'Account not verified. A new code has been sent to your email.', requiresVerification: true, email: user.email });
      }

      return res.status(200).json({ success: true, email: user.email, username: user.username || user._id });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('[/api/auth] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
