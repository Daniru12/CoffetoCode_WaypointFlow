const crypto = require('crypto');

const seenEvents = new Map();

/**
 * Check if a clientEventId or idempotency key has already been processed in memory cache
 * or helper for model verification
 */
function isDuplicateKey(key, ttlMs = 10 * 60 * 1000) {
  if (!key) return false;
  const now = Date.now();
  if (seenEvents.has(key)) {
    const expiresAt = seenEvents.get(key);
    if (now < expiresAt) {
      return true;
    }
  }
  seenEvents.set(key, now + ttlMs);
  return false;
}

module.exports = {
  isDuplicateKey
};
