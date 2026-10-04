const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./env');

// Set public DNS servers for resolving SRV records ONLY if on Windows
if (process.platform === 'win32' && config.mongodb.uri && config.mongodb.uri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    const origLookup = dns.lookup;
    dns.lookup = (hostname, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      dns.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          return origLookup(hostname, options, callback);
        }
        if (options && options.all) {
          return callback(null, addresses.map(a => ({ address: a, family: 4 })));
        }
        return callback(null, addresses[0], 4);
      });
    };
  } catch (e) {
    // Ignore if not permitted
  }
}

let cachedPromise = null;

const connectDB = async () => {
  if (!config.mongodb.uri) {
    console.warn('MongoDB URI is not provided. Skipping database connection for now.');
    return null;
  }

  // If already connected, return existing connection
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  // If already connecting, return existing in-flight promise
  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(config.mongodb.uri, {
        serverSelectionTimeoutMS: 5000
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        cachedPromise = null;
        console.error(`Error connecting to MongoDB: ${error.message}`);
        console.warn('\nTip for MongoDB Atlas:');
        console.warn('1. Check that your current IP address is whitelisted in MongoDB Atlas (Network Access -> Allow Access from Anywhere 0.0.0.0/0).');
        console.warn('2. Alternatively, for local offline development, set MONGODB_URI=mongodb://127.0.0.1:27017/coffetocode in backend/.env\n');
        throw error;
      });
  }

  return cachedPromise;
};

module.exports = connectDB;
