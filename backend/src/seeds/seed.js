const mongoose = require('mongoose');
const config = require('../config/env');
const seedOutlets = require('./seedOutlets');
const seedVehicles = require('./seedVehicles');
const seedUsers = require('./seedUsers');
const seedOrders = require('./seedOrders');

async function seed() {
  console.log('=== Starting WaypointFlow Master Database Seeder ===');

  if (!config.mongodb.uri) {
    console.error('Error: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  await mongoose.connect(config.mongodb.uri);
  console.log('MongoDB connected successfully.');

  try {
    await seedOutlets();
    await seedVehicles();
    await seedUsers();
    await seedOrders();
    console.log('=== Seeding Completed Successfully ===');
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
