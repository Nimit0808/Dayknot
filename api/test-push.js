const { scheduleOneSignalNotification } = require('./_onesignal');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Schedule for 10 seconds in the future just to test Web Push
    const futureTime = new Date(Date.now() + 10000);
    const iso = futureTime.toISOString();
    const sendAfterStr = `${iso.substring(0, 10)} ${iso.substring(11, 19)} GMT`;

    const result = await scheduleOneSignalNotification(userId, "Test Successful! 🎉", "Native notifications are working perfectly even if closed.", sendAfterStr);
    
    if (result && result.id) {
      return res.status(200).json({ success: true, id: result.id });
    } else {
      return res.status(500).json({ error: result.error || 'Failed to schedule notification' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
