const ApiResponse = require('../utils/apiResponse');

/**
 * Validate incoming request body, params, or query with a Zod schema
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.safeParse(req[source]);
      if (!parsed.success) {
        const errors = parsed.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        return res.status(400).json(
          new ApiResponse(400, { errors }, 'Validation failed')
        );
      }
      req[source] = parsed.data;
      next();
    } catch (err) {
      return res.status(400).json(
        new ApiResponse(400, null, `Invalid request parameters: ${err.message}`)
      );
    }
  };
};

module.exports = {
  validate
};
