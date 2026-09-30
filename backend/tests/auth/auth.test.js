const jwt = require('jsonwebtoken');

describe('Auth & JWT Verification Tests', () => {
  const secret = 'test-secret-key-12345';

  test('Should sign and decode JWT payload with user role and depot', () => {
    const payload = {
      id: '507f1f77bcf86cd799439011',
      email: 'dispatcher@waypoint.lk',
      role: 'DISPATCHER',
      depot: 'Peliyagoda'
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, secret);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe('DISPATCHER');
    expect(decoded.depot).toBe('Peliyagoda');
  });

  test('Should fail verification on invalid secret', () => {
    const token = jwt.sign({ id: '123' }, secret);
    expect(() => {
      jwt.verify(token, 'wrong-secret');
    }).toThrow();
  });
});
