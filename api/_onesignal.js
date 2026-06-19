const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

async function scheduleOneSignalNotification(userId, title, body, sendAfterStr) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn("OneSignal keys missing, skipping notification");
    return { error: 'OneSignal Environment Variables are missing! Did you redeploy on Vercel?' };
  }
  
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { "en": title },
        contents: { "en": body },
        send_after: sendAfterStr // format: "2023-08-24 14:00:00 GMT-0700"
      })
    });
    
    const data = await response.json();
    if (data.id) {
      return { id: data.id };
    } else {
      console.error("OneSignal API Error:", data);
      return { error: data.errors ? data.errors.join(', ') : 'Unknown API error' };
    }
  } catch (err) {
    console.error("Error scheduling OneSignal notification:", err);
    return { error: err.message };
  }
}

async function cancelOneSignalNotification(notificationId) {
  if (!notificationId || !ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) return;
  
  try {
    await fetch(`https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${ONESIGNAL_APP_ID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      }
    });
  } catch (err) {
    console.error("Error cancelling OneSignal notification:", err);
  }
}

module.exports = {
  scheduleOneSignalNotification,
  cancelOneSignalNotification
};
