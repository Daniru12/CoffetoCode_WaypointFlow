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

const connectDB = async () => {
  if (!config.mongodb.uri) {
    console.warn('MongoDB URI is not provided. Skipping database connection for now.');
    return null;
  }

  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.warn('\nTip for MongoDB Atlas:');
    console.warn('1. Check that your current IP address is whitelisted in MongoDB Atlas:');
    console.warn('   Go to Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0) or Current IP.');
    console.warn('2. Alternatively, for local offline development, set MONGODB_URI=mongodb://127.0.0.1:27017/coffetocode in backend/.env\n');

    if (config.env === 'production') {
      process.exit(1);
    } else {
      console.warn('Running in development mode: server will continue running while you update IP whitelist or database settings.');
    }
    return null;
  }
};

module.exports = connectDB;
