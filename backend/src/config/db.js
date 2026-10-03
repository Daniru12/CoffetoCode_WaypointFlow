const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./env');

// Set public DNS servers for resolving SRV records if mongodb+srv is used on Windows
if (config.mongodb.uri && config.mongodb.uri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
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
        throw error;
      });
  }

  return cachedPromise;
};

module.exports = connectDB;
