const temperatureRule = require('./temperature.rule');
const capacityRule = require('./capacity.rule');

const rules = [
  temperatureRule,
  capacityRule
  // Add other rules here: access.rule, depot.rule, tripLimit.rule, deliveryWindow.rule, fuelQuota.rule
];

module.exports = {
  validateAssignment: ({ order, vehicle, trip }) => {
    const violations = [];

    for (const rule of rules) {
      const result = rule.validate(order, vehicle, trip);
      if (!result.valid) {
        violations.push({
          code: result.code,
          message: result.message
        });
      }
    }

    if (violations.length > 0) {
      return { valid: false, violations };
    }

    return { valid: true, violations: [] };
  }
};
