/**
 * Time and timezone utilities for WaypointFlow (Asia/Colombo UTC+5:30)
 */

function getColomboTime(date = new Date()) {
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const colombo = new Date(utc + (3600000 * 5.5));
  return colombo;
}

function getColomboTimeParts(date = new Date()) {
  const colombo = getColomboTime(date);
  return {
    hours: colombo.getHours(),
    minutes: colombo.getMinutes(),
    dateString: colombo.toISOString().slice(0, 10),
    timeString: `${String(colombo.getHours()).padStart(2, '0')}:${String(colombo.getMinutes()).padStart(2, '0')}`
  };
}

/**
 * Check if a time string "HH:MM" falls within a window "HH:MM"-"HH:MM"
 */
function isWithinTimeWindow(timeStr, windowOpen, windowClose) {
  if (!timeStr || !windowOpen || !windowClose) return true;

  const toMinutes = (s) => {
    const [h, m] = s.split(':').map(Number);
    return (h * 60) + (m || 0);
  };

  const t = toMinutes(timeStr);
  const open = toMinutes(windowOpen);
  const close = toMinutes(windowClose);

  if (open <= close) {
    return t >= open && t <= close;
  }
  // Crosses midnight
  return t >= open || t <= close;
}

/**
 * Calculates next business run date (defaults to next day)
 */
function getNextSuggestedRun(baseDate = new Date()) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + 1);
  return next;
}

module.exports = {
  getColomboTime,
  getColomboTimeParts,
  isWithinTimeWindow,
  getNextSuggestedRun
};
