const mongoose = require('mongoose');
const config = require('../src/config/env');
const CapacityForecast = require('../src/modules/forecasts/capacityForecast.model');

async function importCalendar() {
  if (!config.mongodb.uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  await mongoose.connect(config.mongodb.uri);

  console.log('Importing operational calendar and capacity forecasts...');

  const initialForecasts = [
    { week: '2026-W40', depot: 'Peliyagoda', brand: 'Fresh', predictedTotalVolume: 450, predictedChilledVolume: 280, estimatedVehicles: 12, estimatedDrivers: 14, estimatedReeferCapacity: 8 },
    { week: '2026-W40', depot: 'Peliyagoda', brand: 'Style', predictedTotalVolume: 320, predictedChilledVolume: 0, estimatedVehicles: 8, estimatedDrivers: 8, estimatedReeferCapacity: 0 },
    { week: '2026-W40', depot: 'Peliyagoda', brand: 'Tech', predictedTotalVolume: 210, predictedChilledVolume: 0, estimatedVehicles: 5, estimatedDrivers: 6, estimatedReeferCapacity: 0 },
    { week: '2026-W41', depot: 'Peliyagoda', brand: 'Fresh', predictedTotalVolume: 490, predictedChilledVolume: 310, estimatedVehicles: 14, estimatedDrivers: 15, estimatedReeferCapacity: 9 }
  ];

  for (const f of initialForecasts) {
    await CapacityForecast.findOneAndUpdate(
      { week: f.week, depot: f.depot, brand: f.brand },
      f,
      { upsert: true, new: true }
    );
  }

  console.log(`Imported ${initialForecasts.length} operational calendar / capacity forecasts.`);
  await mongoose.disconnect();
}

importCalendar().catch(console.error);
