const fs = require('fs');
const path = require('path');
const Vehicle = require('../modules/vehicles/vehicle.model');

function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(obj);
  }
  return rows;
}

const defaultVehicles = [
  { vehicleId: 'VEH-VAN-01', type: 'van', temp: 'reefer', weightCapKg: 1500, volumeCapM3: 8, fuelType: 'diesel', kmPerL: 7.5, weeklyFuelQuotaL: 180, fuelUsedThisWeek: 35, depot: 'Peliyagoda', status: 'AVAILABLE' },
  { vehicleId: 'VEH-VAN-02', type: 'van', temp: 'ambient', weightCapKg: 1800, volumeCapM3: 9, fuelType: 'diesel', kmPerL: 8.0, weeklyFuelQuotaL: 180, fuelUsedThisWeek: 40, depot: 'Peliyagoda', status: 'AVAILABLE' },
  { vehicleId: 'VEH-TRK-01', type: 'truck', temp: 'reefer', weightCapKg: 5000, volumeCapM3: 24, fuelType: 'diesel', kmPerL: 4.0, weeklyFuelQuotaL: 350, fuelUsedThisWeek: 85, depot: 'Peliyagoda', status: 'AVAILABLE' },
  { vehicleId: 'VEH-TRK-02', type: 'truck', temp: 'ambient', weightCapKg: 6000, volumeCapM3: 28, fuelType: 'diesel', kmPerL: 4.2, weeklyFuelQuotaL: 350, fuelUsedThisWeek: 70, depot: 'Peliyagoda', status: 'AVAILABLE' },
  { vehicleId: 'VEH-TRK-03', type: 'truck', temp: 'ambient', weightCapKg: 6000, volumeCapM3: 28, fuelType: 'diesel', kmPerL: 4.2, weeklyFuelQuotaL: 350, fuelUsedThisWeek: 20, depot: 'Peliyagoda', status: 'AVAILABLE' }
];

async function seedVehicles() {
  console.log('Seeding Vehicles...');

  const possiblePaths = [
    process.env.DATA_PATH,
    path.resolve(__dirname, '../../../../data/General Data/vehicles.csv'),
    path.resolve(__dirname, '../../../data/General Data/vehicles.csv'),
    path.resolve(__dirname, '../../data/General Data/vehicles.csv'),
    path.resolve(__dirname, '../data/General Data/vehicles.csv')
  ];

  let csvRows = null;
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      csvRows = parseCsv(p);
      break;
    }
  }

  let vehicleDocs = [];
  if (csvRows && csvRows.length > 0) {
    vehicleDocs = csvRows.map(r => ({
      vehicleId: r.vehicle_id,
      type: r.type,
      temp: r.temp,
      weightCapKg: parseFloat(r.weight_cap_kg) || 2000,
      volumeCapM3: parseFloat(r.volume_cap_m3) || 10,
      fuelType: r.fuel_type || 'diesel',
      kmPerL: parseFloat(r.km_per_l) || 5,
      weeklyFuelQuotaL: parseFloat(r.weekly_fuel_quota_l) || 200,
      fuelUsedThisWeek: 0,
      depot: r.depot,
      status: 'AVAILABLE'
    }));
  } else {
    vehicleDocs = defaultVehicles;
  }

  for (const v of vehicleDocs) {
    await Vehicle.findOneAndUpdate({ vehicleId: v.vehicleId }, v, { upsert: true, new: true });
  }

  console.log(`Seeded ${vehicleDocs.length} Vehicles.`);
}

module.exports = seedVehicles;
