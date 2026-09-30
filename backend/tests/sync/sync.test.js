const { isDuplicateKey } = require('../../src/utils/idempotency.util');

describe('Offline Sync & Idempotency Tests', () => {
  test('Should detect duplicate clientEventId within TTL', () => {
    const eventId = 'evt-client-unique-12345';
    
    // First encounter
    const firstCheck = isDuplicateKey(eventId, 5000);
    expect(firstCheck).toBe(false);

    // Second encounter should be recognized as duplicate
    const secondCheck = isDuplicateKey(eventId, 5000);
    expect(secondCheck).toBe(true);
  });

  test('Different clientEventIds should not conflict', () => {
    const idA = 'evt-a-999';
    const idB = 'evt-b-888';

    expect(isDuplicateKey(idA)).toBe(false);
    expect(isDuplicateKey(idB)).toBe(false);
  });
});
