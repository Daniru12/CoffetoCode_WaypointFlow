const fs = require('fs');
const os = require('os');
const path = require('path');

// Serverless read-only filesystem guard (Vercel / AWS Lambda)
// Intercepts mkdirSync & mkdir to redirect write attempts from read-only /var/task to /tmp
const origMkdirSync = fs.mkdirSync;
fs.mkdirSync = function (dirPath, options) {
  try {
    return origMkdirSync.call(fs, dirPath, options);
  } catch (err) {
    if (err.code === 'EROFS' || err.code === 'EACCES') {
      try {
        const basename = path.basename(dirPath);
        return origMkdirSync.call(fs, path.join(os.tmpdir(), basename), options);
      } catch (fallbackErr) {
        return undefined;
      }
    }
    throw err;
  }
};

const origMkdir = fs.mkdir;
fs.mkdir = function (dirPath, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return origMkdir.call(fs, dirPath, options, (err, ...args) => {
    if (err && (err.code === 'EROFS' || err.code === 'EACCES')) {
      try {
        const basename = path.basename(dirPath);
        return origMkdir.call(fs, path.join(os.tmpdir(), basename), options, callback);
      } catch (fallbackErr) {
        if (callback) return callback(null);
        return undefined;
      }
    }
    if (callback) callback(err, ...args);
  });
};

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
