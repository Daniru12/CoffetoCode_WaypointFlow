/**
 * Master Data Seeder for WaypointFlow
 * Loads Outlets (120), Vehicles (60), and 4 Seeded Role Accounts from competition dataset CSVs.
 * 
 * NOTE: DO NOT RUN AUTOMATICALLY until explicitly requested by operator.
 * Usage: npm run seed
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const config = require('../config/env');
const Outlet = require('../modules/outlets/outlet.model');
const Vehicle = require('../modules/vehicles/vehicle.model');
const User = require('../modules/users/user.model');

// Helper to parse standard CSV text into array of objects
function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Basic CSV splitting (dataset contains clean alphanumeric and time strings)
    const values = line.split(',').map((v) => v.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(obj);
  }
  return rows;
}

// Locate datasets folder
function findDataDir() {
  const possiblePaths = [
    process.env.DATA_PATH,
    path.resolve(__dirname, '../../../../data'),
    path.resolve(__dirname, '../../../data'),
    path.resolve(__dirname, '../../data'),
    path.resolve(__dirname, '../data')
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error('Data directory not found. Please ensure dataset zip is extracted.');
}

async function seed() {
  console.log('--- Starting WaypointFlow Seed Script ---');

  if (!config.mongodb.uri) {
    console.error('Error: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  await mongoose.connect(config.mongodb.uri);
  console.log('MongoDB connected successfully.');

  const dataDir = findDataDir();
  console.log(`Using dataset root: ${dataDir}`);

  // 1. Seed Outlets
  const outletsCsvPath = path.join(dataDir, 'General Data', 'outlets.csv');
  const rawOutlets = parseCsv(outletsCsvPath);
  console.log(`Parsed ${rawOutlets.length} outlets from CSV.`);

  await Outlet.deleteMany({});
  const outletDocs = rawOutlets.map((r) => ({
    outletId: r.outlet_id,
    brand: r.brand,
    district: r.district,
    depot: r.depot,
    dockType: r.dock_type || 'street',
    parkingConstraint: r.parking_constraint || 'normal',
    mallWindow: r.mall_window || null,
    windowOpenTime: r.window_open_time || '06:00',
    windowCloseTime: r.window_close_time || '08:00'
  }));

  const insertedOutlets = await Outlet.insertMany(outletDocs);
  console.log(`Successfully seeded ${insertedOutlets.length} Outlets.`);

  // 2. Seed Vehicles
  const vehiclesCsvPath = path.join(dataDir, 'General Data', 'vehicles.csv');
  const rawVehicles = parseCsv(vehiclesCsvPath);
  console.log(`Parsed ${rawVehicles.length} vehicles from CSV.`);

  await Vehicle.deleteMany({});
  const vehicleDocs = rawVehicles.map((r) => ({
    vehicleId: r.vehicle_id,
    type: r.type,
    temp: r.temp,
    weightCapKg: parseFloat(r.weight_cap_kg) || 0,
    volumeCapM3: parseFloat(r.volume_cap_m3) || 0,
    fuelType: r.fuel_type || 'diesel',
    kmPerL: parseFloat(r.km_per_l) || 0,
    weeklyFuelQuotaL: parseFloat(r.weekly_fuel_quota_l) || 0,
    depot: r.depot,
    status: 'AVAILABLE'
  }));

  const insertedVehicles = await Vehicle.insertMany(vehicleDocs);
  console.log(`Successfully seeded ${insertedVehicles.length} Vehicles.`);

  // 3. Seed Default Role Accounts for Judge Walkthrough
  await User.deleteMany({});
  const defaultPassword = await bcrypt.hash('Waypoint2026!', 10);
  const sampleOutlet = await Outlet.findOne({ outletId: 'OUT001' });

  const seedUsers = [
    {
      name: 'Central Dispatcher',
      email: 'dispatcher@waypoint.lk',
      password: defaultPassword,
      role: 'DISPATCHER',
      depot: 'Peliyagoda'
    },
    {
      name: 'Warehouse Loader',
      email: 'loader@waypoint.lk',
      password: defaultPassword,
      role: 'LOADER',
      depot: 'Peliyagoda'
    },
    {
      name: 'Fleet Driver',
      email: 'driver@waypoint.lk',
      password: defaultPassword,
      role: 'DRIVER',
      depot: 'Peliyagoda'
    },
    {
      name: 'Colombo Store Manager',
      email: 'store.manager@waypoint.lk',
      password: defaultPassword,
      role: 'STORE_MANAGER',
      depot: 'Peliyagoda',
      outlet: sampleOutlet ? sampleOutlet._id : null
    }
  ];

  await User.insertMany(seedUsers);
  console.log('Successfully seeded 4 default role accounts (Password: Waypoint2026!):');
  seedUsers.forEach((u) => console.log(`  - [${u.role}] ${u.email}`));

  console.log('--- Seeding Completed Successfully ---');
  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
