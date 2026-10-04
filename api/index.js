let app;
let initError = null;

try {
  app = require('./backend/src/app');
} catch (err) {
  initError = err;
  console.error('Fatal initialization error in backend/src/app:', err);
}

module.exports = (req, res) => {
  if (initError || !app) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return res.status(500).json({
      statusCode: 500,
      data: null,
      message: `Server initialization error: ${initError ? initError.message : 'App could not be loaded'}`,
      success: false
    });
  }

  return app(req, res);
};
