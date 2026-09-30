const { isWithinTimeWindow } = require('../../src/utils/time.util');

describe('Order & Delivery Window Logic Tests', () => {
  test('isWithinTimeWindow accurately detects valid delivery windows', () => {
    // Delivery window 06:00 to 08:00
    expect(isWithinTimeWindow('06:30', '06:00', '08:00')).toBe(true);
    expect(isWithinTimeWindow('06:00', '06:00', '08:00')).toBe(true);
    expect(isWithinTimeWindow('08:00', '06:00', '08:00')).toBe(true);

    // Outside delivery window
    expect(isWithinTimeWindow('09:15', '06:00', '08:00')).toBe(false);
    expect(isWithinTimeWindow('05:30', '06:00', '08:00')).toBe(false);
  });

  test('Brand chilled order compatibility validation', () => {
    const isBrandAllowedChilled = (brand, tempRequirement) => {
      if (brand !== 'Fresh' && tempRequirement === 'chilled') {
        return false;
      }
      return true;
    };

    expect(isBrandAllowedChilled('Fresh', 'chilled')).toBe(true);
    expect(isBrandAllowedChilled('Fresh', 'ambient')).toBe(true);
    expect(isBrandAllowedChilled('Style', 'ambient')).toBe(true);
    expect(isBrandAllowedChilled('Style', 'chilled')).toBe(false);
    expect(isBrandAllowedChilled('Tech', 'chilled')).toBe(false);
  });
});
