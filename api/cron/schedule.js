const { connectDB } = require('../_mongodb');
const { scheduleOneSignalNotification } = require('../_onesignal');
const { getNextOccurrenceUTC } = require('../_timezone');

module.exports = async function handler(req, res) {
  // Verify authorization (Vercel Cron usually passes a Bearer token or we can just rely on vercel config)
  // For safety, you might want to secure this endpoint if it's hit manually
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectDB();
    const tasks = db.collection('tasks');
    
    // Find all active tasks that have reminders enabled
    const allReminders = await tasks.find({ reminderEnabled: true }).toArray();
    let scheduledCount = 0;

    for (const task of allReminders) {
      if (!task.timezone || !task.reminderTime) continue;
      
      // Calculate today's delivery time for this specific task based on its timezone
      const sendAfterStr = getNextOccurrenceUTC(task.timezone, task.reminderTime);
      
      const oneSignalNotificationId = await scheduleOneSignalNotification(
        task.userId,
        "Dayknot Reminder",
        `It's time to: ${task.title}`,
        sendAfterStr
      );

      if (oneSignalNotificationId) {
        // Save the new notification ID so it can be cancelled if the task is edited today
        await tasks.updateOne(
          { _id: task._id },
          { $set: { oneSignalNotificationId } }
        );
        scheduledCount++;
      }
    }

    return res.status(200).json({ success: true, scheduledCount });
  } catch (err) {
    console.error('[/api/cron/schedule] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
