const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email } = req.body || {};

  if (!email || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      // Return 200 even if not found to prevent email enumeration
      return res.status(200).json({ success: true, message: 'If an account exists, a reset code was sent.' });
    }

    if (action === 'reset_request') {
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await users.updateOne(
        { _id: user._id },
        { $set: { resetCode, resetCodeExpires } }
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
              to: [normalizedEmail],
              subject: 'Password Reset Request',
              html: `<p>Your password reset code is: <strong>${resetCode}</strong></p><p>This code will expire in 15 minutes.</p>`
            })
          });
        } catch (e) {
          console.error('Failed to send reset email:', e);
        }
      }

      return res.status(200).json({ success: true, message: 'Reset code sent.' });
    }
    
    else if (action === 'reset') {
      const { code, newPasswordHash } = req.body;
      if (!code || !newPasswordHash) return res.status(400).json({ error: 'Missing code or password hash' });

      if (!user.resetCode || !user.resetCodeExpires) {
        return res.status(400).json({ error: 'No password reset requested' });
      }

      if (new Date() > new Date(user.resetCodeExpires)) {
        return res.status(400).json({ error: 'Reset code has expired' });
      }

      if (user.resetCode !== code.trim()) {
        return res.status(401).json({ error: 'Invalid reset code' });
      }

      await users.updateOne(
        { _id: user._id },
        { 
          $set: { passwordHash: newPasswordHash },
          $unset: { resetCode: "", resetCodeExpires: "" }
        }
      );

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('[/api/password] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
