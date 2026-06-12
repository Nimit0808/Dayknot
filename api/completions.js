// /api/completions — add or remove a task completion record
//
// POST   /api/completions  { userId, taskId, completedDate }  → mark done
// DELETE /api/completions  { userId, taskId, completedDate }  → unmark done

const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { userId, taskId, completedDate } = req.body || {};

  if (!userId || !taskId || !completedDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = await connectDB();
    const completions = db.collection('completions');

    if (req.method === 'POST') {
      // Use upsert so duplicate taps don't cause duplicate records
      await completions.updateOne(
        { userId, taskId, completedDate },
        { $set: { userId, taskId, completedDate } },
        { upsert: true }
      );
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await completions.deleteOne({ userId, taskId, completedDate });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/completions] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
