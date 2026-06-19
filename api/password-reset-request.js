const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const db = await connectDB();
    const users = db.collection('users');

    const user = await users.findOne({ email: normalizedEmail });

    // Always return success even if user not found to prevent email enumeration attacks
    if (!user) {
      return res.status(200).json({ success: true, message: 'If the email exists, a reset code was sent.' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          resetCode,
          resetExpires
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
            to: [normalizedEmail],
            subject: 'Reset your Dayknot password',
            html: `<p>Your password reset code is: <strong>${resetCode}</strong></p><p>This code will expire in 15 minutes.</p>`
          })
        });
      } catch (e) {
        console.error('Failed to send reset email:', e);
      }
    } else {
      console.log(`[MOCK EMAIL] Password reset code for ${normalizedEmail} is ${resetCode}`);
    }

    return res.status(200).json({ success: true, message: 'If the email exists, a reset code was sent.' });
  } catch (err) {
    console.error('[/api/password-reset-request] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
