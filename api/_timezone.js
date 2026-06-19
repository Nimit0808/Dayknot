function getNextOccurrenceUTC(timezone, timeStr) {
  // timeStr: "17:25"
  // timezone: "Asia/Kolkata"
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Use Intl.DateTimeFormat to get the current date/time in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(new Date());
  const dateObj = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      dateObj[part.type] = parseInt(part.value, 10);
    }
  }
  
  // Create a Date object for today in the target timezone
  // Note: Date.UTC() takes 0-indexed month
  let targetDate = new Date(Date.UTC(dateObj.year, dateObj.month - 1, dateObj.day, hours, minutes, 0));
  
  // To compute the actual UTC time representing this target, we must find the offset
  // We can do this by constructing a string "YYYY-MM-DDTHH:mm:00" and relying on Node's Date if it supported IANA,
  // But Node's Date doesn't easily parse arbitrary timezone strings.
  
  // Simpler approach: 
  // 1. Get current UTC time.
  const nowUtc = new Date();
  
  // 2. Format it to the target timezone
  const tzDateStr = nowUtc.toLocaleString('en-US', { timeZone: timezone });
  const tzDate = new Date(tzDateStr); // This is a "fake" UTC date representing the local time
  
  // 3. Calculate the offset between actual UTC and target timezone local time
  const offsetMs = tzDate.getTime() - nowUtc.getTime();
  
  // 4. Create the target time in the "fake" UTC
  const targetFakeUtc = new Date(tzDate.getFullYear(), tzDate.getMonth(), tzDate.getDate(), hours, minutes, 0);
  
  // 5. Convert back to actual UTC by subtracting the offset
  let targetActualUtc = new Date(targetFakeUtc.getTime() - offsetMs);
  
  // If target time has already passed today, schedule for tomorrow
  if (targetActualUtc.getTime() <= nowUtc.getTime()) {
    targetFakeUtc.setDate(targetFakeUtc.getDate() + 1);
    targetActualUtc = new Date(targetFakeUtc.getTime() - offsetMs);
  }
  
  // Return the ISO string in UTC which OneSignal `send_after` natively supports!
  // format: "YYYY-MM-DD HH:mm:ss GMT"
  const iso = targetActualUtc.toISOString();
  return `${iso.substring(0, 10)} ${iso.substring(11, 19)} GMT`;
}

module.exports = { getNextOccurrenceUTC };
