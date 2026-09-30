const availabilityRule = require('./rules/availability.rule');
const depotRule = require('./rules/depot.rule');
const temperatureRule = require('./rules/temperature.rule');
const accessRule = require('./rules/access.rule');
const brandDistrictRule = require('./rules/brandDistrict.rule');
const weightRule = require('./rules/weight.rule');
const volumeRule = require('./rules/volume.rule');
const tripLimitRule = require('./rules/tripLimit.rule');
const windowRule = require('./rules/window.rule');
const fuelRule = require('./rules/fuel.rule');

// Exact validation order specified in Designathon specification
const orderedRules = [
  availabilityRule,   // 1. Vehicle availability
  depotRule,          // 2. Depot compatibility
  temperatureRule,    // 3. Temperature compatibility
  accessRule,         // 4. Van-only access
  brandDistrictRule,  // 5. Brand + district compatibility
  weightRule,         // 6. Weight capacity
  volumeRule,         // 7. Volume capacity
  tripLimitRule,      // 8. Maximum trip limit
  windowRule,         // 9. Delivery window
  fuelRule            // 10. Fuel quota
];

module.exports = {
  /**
   * Validates an order assignment against vehicle and trip context
   * @param {Object} param0 
   * @returns {{ valid: boolean, violations: Array<{ code: string, message: string }> }}
   */
  validateAssignment({ order, vehicle, trip, context = {} }) {
    const violations = [];

    for (const rule of orderedRules) {
      const result = rule.validate(order, vehicle, trip, context);
      if (!result.valid) {
        violations.push({
          code: result.code,
          message: result.message
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
};
