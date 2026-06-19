const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, currentUser } = req.body || {};

  if (!currentUser || !action) {
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

    if (action === 'update_username') {
      const { newUsername } = req.body;
      if (!newUsername) return res.status(400).json({ error: 'Missing newUsername' });
      
      const normalizedNewUsername = newUsername.trim().toLowerCase();
      if (normalizedNewUsername.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters long' });

      if (normalizedCurrentUser !== normalizedNewUsername) {
        const existingUser = await users.findOne({ username: normalizedNewUsername });
        if (existingUser) return res.status(400).json({ error: 'Username is already taken' });
      }

      await users.updateOne({ _id: user._id }, { $set: { username: normalizedNewUsername } });
      
      // Update completions & tasks
      const completions = db.collection('completions');
      await completions.updateMany({ userId: normalizedCurrentUser }, { $set: { userId: normalizedNewUsername } });
      const tasks = db.collection('tasks');
      await tasks.updateMany({ userId: normalizedCurrentUser }, { $set: { userId: normalizedNewUsername } });

      return res.status(200).json({ success: true, username: normalizedNewUsername });
    }
    
    else if (action === 'change_email_request') {
      const { newEmail } = req.body;
      if (!newEmail) return res.status(400).json({ error: 'Missing newEmail' });

      const normalizedNewEmail = newEmail.trim().toLowerCase();
      const existingUser = await users.findOne({ email: normalizedNewEmail });
      if (existingUser) return res.status(400).json({ error: 'Email is already taken' });

      const pendingEmailCode = Math.floor(100000 + Math.random() * 900000).toString();
      const pendingEmailExpires = new Date(Date.now() + 15 * 60 * 1000);

      await users.updateOne(
        { _id: user._id },
        { $set: { pendingEmail: normalizedNewEmail, pendingEmailCode, pendingEmailExpires } }
      );

      if (process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Dayknot <onboarding@resend.dev>',
              to: [normalizedNewEmail],
              subject: 'Verify your new email on Dayknot',
              html: `<p>Your email verification code is: <strong>${pendingEmailCode}</strong></p><p>This code will expire in 15 minutes.</p>`
            })
          });
        } catch (e) { console.error('Failed to send verification email:', e); }
      }

      return res.status(200).json({ success: true, message: 'Verification code sent' });
    }
    
    else if (action === 'change_email_verify') {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Missing code' });

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
      await users.updateOne(
        { _id: user._id },
        { $set: { email: newEmail }, $unset: { pendingEmail: "", pendingEmailCode: "", pendingEmailExpires: "" } }
      );

      return res.status(200).json({ success: true, email: newEmail });
    }
    
    else if (action === 'change_password') {
      const { currentPasswordHash, newPasswordHash } = req.body;
      if (!currentPasswordHash || !newPasswordHash) return res.status(400).json({ error: 'Missing password hashes' });

      if (!user.passwordHash) return res.status(400).json({ error: 'Account uses Google Sign-In and has no password.' });
      if (user.passwordHash !== currentPasswordHash) return res.status(401).json({ error: 'Incorrect current password' });

      await users.updateOne({ _id: user._id }, { $set: { passwordHash: newPasswordHash } });
      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }

    else if (action === 'upload_picture') {
      const { picture } = req.body;
      if (!picture) return res.status(400).json({ error: 'Missing picture' });

      // picture should be a Base64 encoded string
      await users.updateOne({ _id: user._id }, { $set: { picture } });
      return res.status(200).json({ success: true, picture });
    }

    else if (action === 'update_theme') {
      const { theme, accent } = req.body;
      const updateData = {};
      if (theme) updateData.theme = theme;
      if (accent) updateData.accent = accent;
      
      if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'Nothing to update' });

      await users.updateOne({ _id: user._id }, { $set: updateData });
      return res.status(200).json({ success: true, ...updateData });
    }
    
    else if (action === 'delete_account') {
      const userIdToClear = user.username || normalizedCurrentUser;
      const tasks = db.collection('tasks');
      const completions = db.collection('completions');

      await tasks.deleteMany({ userId: userIdToClear });
      await completions.deleteMany({ userId: userIdToClear });
      await users.deleteOne({ _id: user._id });

      return res.status(200).json({ success: true, message: 'Account deleted successfully' });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error('[/api/account] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
