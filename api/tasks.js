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

  const { scheduleOneSignalNotification, cancelOneSignalNotification } = require('./_onesignal');
  const { getNextOccurrenceUTC } = require('./_timezone');

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

      let oneSignalNotificationId = null;
      if (task.reminderEnabled && task.reminderTime && req.body.timezone) {
        const sendAfterStr = getNextOccurrenceUTC(req.body.timezone, task.reminderTime);
        oneSignalNotificationId = await scheduleOneSignalNotification(userId, "Dayknot Reminder", `It's time to: ${task.title}`, sendAfterStr);
      }

      await tasks.insertOne({
        _id: task.id,
        userId,
        timezone: req.body.timezone,
        title: task.title,
        priority: task.priority,
        activeDays: task.activeDays,
        reminderEnabled: task.reminderEnabled,
        reminderTime: task.reminderTime,
        oneSignalNotificationId,
        createdAt: new Date(),
      });
      return res.status(200).json({ success: true });
    }

    // ── PUT (update) ──────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const { userId, taskId, updates } = req.body || {};
      if (!userId || !taskId || !updates) return res.status(400).json({ error: 'Missing fields' });

      const oldTask = await tasks.findOne({ _id: taskId, userId });
      if (oldTask && oldTask.oneSignalNotificationId) {
        await cancelOneSignalNotification(oldTask.oneSignalNotificationId);
      }

      let oneSignalNotificationId = null;
      if (updates.reminderEnabled && updates.reminderTime && req.body.timezone) {
        const sendAfterStr = getNextOccurrenceUTC(req.body.timezone, updates.reminderTime);
        oneSignalNotificationId = await scheduleOneSignalNotification(userId, "Dayknot Reminder", `It's time to: ${updates.title}`, sendAfterStr);
      }

      await tasks.updateOne(
        { _id: taskId, userId },
        { $set: { 
            timezone: req.body.timezone,
            title: updates.title, 
            priority: updates.priority, 
            activeDays: updates.activeDays,
            reminderEnabled: updates.reminderEnabled,
            reminderTime: updates.reminderTime,
            oneSignalNotificationId
          } 
        }
      );
      return res.status(200).json({ success: true });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { taskId, userId } = req.query;
      if (!taskId || !userId) return res.status(400).json({ error: 'Missing fields' });

      const taskToDelete = await tasks.findOne({ _id: taskId, userId });
      if (taskToDelete && taskToDelete.oneSignalNotificationId) {
        await cancelOneSignalNotification(taskToDelete.oneSignalNotificationId);
      }

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
