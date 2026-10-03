const fs = require('fs');
const path = require('path');
const Outlet = require('../modules/outlets/outlet.model');

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

const defaultOutlets = [
  { outletId: 'OUT001', name: 'Fresh Super Colombo 03', brand: 'Fresh', district: 'Colombo-South', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'van_only', windowOpenTime: '06:00', windowCloseTime: '08:00', latitude: 6.9034, longitude: 79.8542 },
  { outletId: 'OUT002', name: 'Fresh Express Colombo 07', brand: 'Fresh', district: 'Colombo-Central', depot: 'Peliyagoda', dockType: 'loading_bay', parkingConstraint: 'normal', windowOpenTime: '06:00', windowCloseTime: '10:00', latitude: 6.9088, longitude: 79.8711 },
  { outletId: 'OUT003', name: 'Style Trend Havelock Mall', brand: 'Style', district: 'Colombo-South', depot: 'Peliyagoda', dockType: 'mall_dock', parkingConstraint: 'mall_dock', mallWindow: '06:00-08:00', windowOpenTime: '06:00', windowCloseTime: '08:00', latitude: 6.8833, longitude: 79.8654 },
  { outletId: 'OUT004', name: 'TechZone Liberty Plaza', brand: 'Tech', district: 'Colombo-Central', depot: 'Peliyagoda', dockType: 'mall_dock', parkingConstraint: 'van_only', mallWindow: '07:00-09:00', windowOpenTime: '07:00', windowCloseTime: '09:00', latitude: 6.9112, longitude: 79.8519 },
  { outletId: 'OUT005', name: 'Fresh Mart Dehiwala', brand: 'Fresh', district: 'Colombo-South', depot: 'Peliyagoda', dockType: 'loading_bay', parkingConstraint: 'normal', windowOpenTime: '06:00', windowCloseTime: '11:00', latitude: 6.8488, longitude: 79.8694 },
  { outletId: 'OUT006', name: 'Style Studio Kandy City', brand: 'Style', district: 'Kandy-Metro', depot: 'Kandy', dockType: 'street', parkingConstraint: 'normal', windowOpenTime: '08:00', windowCloseTime: '12:00', latitude: 7.2906, longitude: 80.6337 }
];

async function seedOutlets() {
  console.log('Seeding Outlets...');

  const possiblePaths = [
    process.env.DATA_PATH,
    path.resolve(__dirname, '../../../../data/General Data/outlets.csv'),
    path.resolve(__dirname, '../../../data/General Data/outlets.csv'),
    path.resolve(__dirname, '../../data/General Data/outlets.csv'),
    path.resolve(__dirname, '../data/General Data/outlets.csv')
  ];

  let csvRows = null;
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      csvRows = parseCsv(p);
      break;
    }
  }

  let outletDocs = [];
  if (csvRows && csvRows.length > 0) {
    outletDocs = csvRows.map(r => ({
      outletId: r.outlet_id,
      name: r.name || `Outlet ${r.outlet_id}`,
      brand: r.brand,
      district: r.district,
      depot: r.depot,
      dockType: r.dock_type || 'street',
      parkingConstraint: r.parking_constraint || 'normal',
      mallWindow: r.mall_window || null,
      windowOpenTime: r.window_open_time || '06:00',
      windowCloseTime: r.window_close_time || '08:00',
      latitude: parseFloat(r.latitude) || undefined,
      longitude: parseFloat(r.longitude) || undefined
    }));
  } else {
    outletDocs = defaultOutlets;
  }

  for (const o of outletDocs) {
    await Outlet.findOneAndUpdate({ outletId: o.outletId }, o, { upsert: true, new: true });
  }

  console.log(`Seeded ${outletDocs.length} Outlets.`);
}

module.exports = seedOutlets;
