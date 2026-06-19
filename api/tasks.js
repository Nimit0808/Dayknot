// /api/tasks  — task CRUD for authenticated users
//
// GET    /api/tasks?userId=xxx           → list all tasks for user
// POST   /api/tasks                      → create task  { userId, task }
// PUT    /api/tasks                      → update task  { userId, taskId, updates }
// DELETE /api/tasks?taskId=xxx&userId=xxx → delete task + cascade completions

const { connectDB } = require('./_mongodb');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = await connectDB();
    const tasks = db.collection('tasks');

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const userTasks = await tasks.find({ userId }).toArray();
      return res.status(200).json({ tasks: userTasks });
    }

    // ── POST (create) ─────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { userId, task } = req.body || {};
      if (!userId || !task) return res.status(400).json({ error: 'Missing fields' });

      await tasks.insertOne({
        _id: task.id,
        userId,
        title: task.title,
        priority: task.priority,
        category: task.category,
        activeDays: task.activeDays,
        createdAt: new Date(),
      });
      return res.status(200).json({ success: true });
    }

    // ── PUT (update) ──────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const { userId, taskId, updates } = req.body || {};
      if (!userId || !taskId || !updates) return res.status(400).json({ error: 'Missing fields' });

      await tasks.updateOne(
        { _id: taskId, userId },
        { $set: { title: updates.title, priority: updates.priority, category: updates.category, activeDays: updates.activeDays } }
      );
      return res.status(200).json({ success: true });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { taskId, userId } = req.query;
      if (!taskId || !userId) return res.status(400).json({ error: 'Missing fields' });

      await tasks.deleteOne({ _id: taskId, userId });

      // Cascade: remove all completions for this task
      const completions = db.collection('completions');
      await completions.deleteMany({ taskId, userId });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/tasks] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
