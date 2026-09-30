const mongoose = require('mongoose');
const config = require('../src/config/env');
const seedVehicles = require('../src/seeds/seedVehicles');

async function run() {
  if (!config.mongodb.uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  await mongoose.connect(config.mongodb.uri);
  await seedVehicles();
  await mongoose.disconnect();
}

run().catch(console.error);
