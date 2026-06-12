// GET /api/sync?userId=xxx
// Returns all tasks and completions for a user in a single round-trip.
// Called once after login to hydrate the client state.

const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const db = await connectDB();

    const [tasks, completions] = await Promise.all([
      db.collection('tasks').find({ userId }).toArray(),
      db.collection('completions').find({ userId }).toArray(),
    ]);

    return res.status(200).json({ tasks, completions });
  } catch (err) {
    console.error('[/api/sync] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
