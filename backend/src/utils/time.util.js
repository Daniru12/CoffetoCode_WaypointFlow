/**
 * Time and timezone utilities for WaypointFlow (Asia/Colombo UTC+5:30)
 * Includes competition 16:00 cutoff logic and interactive simulation support.
 */

let simulatedOffsetMs = 0;

function getEffectiveTime() {
  return new Date(Date.now() + simulatedOffsetMs);
}

function setSimulatedTime(targetDateOrTimeString) {
  if (!targetDateOrTimeString) {
    simulatedOffsetMs = 0;
    return getEffectiveTime();
  }

  if (typeof targetDateOrTimeString === 'string' && targetDateOrTimeString.includes(':')) {
    // E.g. "14:00" or "16:30" - set today's Colombo time to this hour & minute
    const nowColombo = getColomboTime();
    const [h, m] = targetDateOrTimeString.split(':').map(Number);
    const target = new Date(nowColombo);
    target.setHours(h, m, 0, 0);
    // Convert back from Colombo to UTC offset
    simulatedOffsetMs = target.getTime() - nowColombo.getTime();
    return getEffectiveTime();
  }

  const target = new Date(targetDateOrTimeString);
  simulatedOffsetMs = target.getTime() - Date.now();
  return getEffectiveTime();
}

function resetSimulatedTime() {
  simulatedOffsetMs = 0;
  return getEffectiveTime();
}

function getSimulationStatus() {
  return {
    isSimulated: simulatedOffsetMs !== 0,
    offsetMinutes: Math.round(simulatedOffsetMs / 60000),
    effectiveColomboTime: getColomboTimeParts(getEffectiveTime())
  };
}

function getColomboTime(date = getEffectiveTime()) {
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const colombo = new Date(utc + (3600000 * 5.5));
  return colombo;
}

function getColomboTimeParts(date = getEffectiveTime()) {
  const colombo = getColomboTime(date);
  return {
    hours: colombo.getHours(),
    minutes: colombo.getMinutes(),
    dateString: colombo.toISOString().slice(0, 10),
    timeString: `${String(colombo.getHours()).padStart(2, '0')}:${String(colombo.getMinutes()).padStart(2, '0')}`
  };
}

/**
 * Check if the 16:00 cutoff has passed for a target next-day delivery
 */
function isCutoffPassed(now = getEffectiveTime()) {
  const parts = getColomboTimeParts(now);
  return parts.hours > 16 || (parts.hours === 16 && parts.minutes > 0);
}

/**
 * Calculates remaining hours and minutes until 16:00 Colombo cutoff
 */
function getTimeUntilCutoff(now = getEffectiveTime()) {
  const parts = getColomboTimeParts(now);
  const currentTotalMinutes = parts.hours * 60 + parts.minutes;
  const cutoffMinutes = 16 * 60; // 16:00 = 960 min

  if (currentTotalMinutes >= cutoffMinutes) {
    return {
      passed: true,
      hoursRemaining: 0,
      minutesRemaining: 0,
      message: '16:00 Cutoff has passed. Orders will queue for subsequent run.'
    };
  }

  const diff = cutoffMinutes - currentTotalMinutes;
  const hoursRemaining = Math.floor(diff / 60);
  const minutesRemaining = diff % 60;

  return {
    passed: false,
    hoursRemaining,
    minutesRemaining,
    message: `${hoursRemaining}h ${minutesRemaining}m remaining until 16:00 cutoff`
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
 * Calculates next business run date (defaults to next day, skipping Sunday if applicable)
 */
function getNextSuggestedRun(baseDate = getEffectiveTime()) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + 1);
  // Sunday = 0; Waypoint operates Mon-Sat per Challenge Booklet p. 5
  if (next.getDay() === 0) {
    next.setDate(next.getDate() + 1); // skip to Monday
  }
  return next;
}

module.exports = {
  getEffectiveTime,
  setSimulatedTime,
  resetSimulatedTime,
  getSimulationStatus,
  getColomboTime,
  getColomboTimeParts,
  isCutoffPassed,
  getTimeUntilCutoff,
  isWithinTimeWindow,
  getNextSuggestedRun
};
