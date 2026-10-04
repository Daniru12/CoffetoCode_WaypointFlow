const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Order = require('../modules/orders/order.model');
const Outlet = require('../modules/outlets/outlet.model');
const User = require('../modules/users/user.model');
const Vehicle = require('../modules/vehicles/vehicle.model');
const Trip = require('../modules/trips/trip.model');
const DeliveryPlan = require('../modules/planning/deliveryPlan.model');
const Delivery = require('../modules/deliveries/delivery.model');
const LoadingJob = require('../modules/loading/loadingJob.model');

async function seedDemoData() {
  console.log('--- SEEDING DEMO DATA FOR DISPATCHER & DRIVER ---');
  await mongoose.connect(process.env.MONGODB_URI);

  // Find Users
  const dispatcherPel = await User.findOne({ email: 'dispatcher@waypoint.lk' }) || await User.findOne({ role: 'DISPATCHER' });
  const dispatcherKandy = await User.findOne({ email: 'luqmandispatcher@gmail.com' }) || dispatcherPel;
  const driverPel = await User.findOne({ email: 'driver@waypoint.lk' }) || await User.findOne({ role: 'DRIVER' });
  const driverKandy = await User.findOne({ email: 'luqmandriver@gmail.com' }) || driverPel;

  // Find Outlets
  const peliyagodaOutlets = await Outlet.find({ depot: 'Peliyagoda' });
  const kandyOutlets = await Outlet.find({ depot: 'Kandy' });

  console.log(`Found ${peliyagodaOutlets.length} Peliyagoda outlets and ${kandyOutlets.length} Kandy outlets`);

  // Find Vehicles
  const kandyReeferVan = await Vehicle.findOne({ depot: 'Kandy', temp: 'reefer' }) || await Vehicle.findOne({ depot: 'Kandy' });
  const pelTruck = await Vehicle.findOne({ depot: 'Peliyagoda', type: 'truck' }) || await Vehicle.findOne({ depot: 'Peliyagoda' });
  const pelReefer = await Vehicle.findOne({ depot: 'Peliyagoda', temp: 'reefer' });

  // 1. Create orders for 2026-10-05 and 2026-10-04 for Peliyagoda Unallocated Queue
  const dates = ['2026-10-04T08:00:00.000Z', '2026-10-05T08:00:00.000Z'];
  const newOrders = [];

  // Peliyagoda Orders for Dispatcher Demo (Fresh, Style, Tech)
  for (let i = 0; i < Math.min(12, peliyagodaOutlets.length); i++) {
    const out = peliyagodaOutlets[i];
    const brand = i % 3 === 0 ? 'Fresh' : i % 3 === 1 ? 'Style' : 'Tech';
    const isFresh = brand === 'Fresh';
    const reqDate = new Date(i % 2 === 0 ? dates[1] : dates[0]);

    const orderRef = `ORD-DEMO-PEL-${brand.toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
    
    // Avoid duplicate orderRefs
    await Order.deleteOne({ orderRef });

    const ord = await Order.create({
      orderRef,
      outlet: out._id,
      brand,
      requestedDeliveryDate: reqDate,
      tempRequirement: isFresh ? 'chilled' : 'ambient',
      items: [
        { itemName: `${brand} Package A`, qty: 5 + i * 2, unit: 'cases', weightKg: (5 + i * 2) * 15, volumeM3: (5 + i * 2) * 0.08 }
      ],
      orderUnits: 5 + i * 2,
      orderWeightKg: (5 + i * 2) * 15,
      orderVolumeM3: Math.round((5 + i * 2) * 0.08 * 10) / 10,
      deliveryWindow: {
        start: isFresh ? '05:00' : '08:00',
        end: isFresh ? '08:00' : '17:00'
      },
      status: 'CONFIRMED',
      createdBy: dispatcherPel._id,
      orderSource: 'MANUAL',
      dispatchCycle: 'CURRENT_CYCLE'
    });
    newOrders.push(ord);
  }

  // Kandy Orders for Dispatcher Demo (Fresh, Style, Tech)
  for (let i = 0; i < Math.min(8, kandyOutlets.length); i++) {
    const out = kandyOutlets[i];
    const brand = i % 2 === 0 ? 'Fresh' : 'Style';
    const isFresh = brand === 'Fresh';
    const reqDate = new Date(dates[1]);

    const orderRef = `ORD-DEMO-KAN-${brand.toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
    await Order.deleteOne({ orderRef });

    const ord = await Order.create({
      orderRef,
      outlet: out._id,
      brand,
      requestedDeliveryDate: reqDate,
      tempRequirement: isFresh ? 'chilled' : 'ambient',
      items: [
        { itemName: `${brand} Highland Pack`, qty: 4 + i, unit: 'cases', weightKg: (4 + i) * 12, volumeM3: (4 + i) * 0.06 }
      ],
      orderUnits: 4 + i,
      orderWeightKg: (4 + i) * 12,
      orderVolumeM3: Math.round((4 + i) * 0.06 * 10) / 10,
      deliveryWindow: {
        start: isFresh ? '05:00' : '08:30',
        end: isFresh ? '08:00' : '16:00'
      },
      status: 'CONFIRMED',
      createdBy: dispatcherKandy._id,
      orderSource: 'MANUAL',
      dispatchCycle: 'CURRENT_CYCLE'
    });
    newOrders.push(ord);
  }

  console.log(`Created ${newOrders.length} confirmed demo orders across Peliyagoda and Kandy`);

  // 2. Set up ACTIVE PUBLISHED TRIP FOR KANDY DRIVER (luqmandriver@gmail.com)
  const kandyPlan = await DeliveryPlan.findOne({ depot: 'Kandy', status: 'PUBLISHED' }) || await DeliveryPlan.create({
    planRef: 'PLAN-KAN-20261005-DEMO',
    deliveryDate: new Date('2026-10-05T00:00:00.000Z'),
    depot: 'Kandy',
    status: 'PUBLISHED',
    publishedAt: new Date(),
    totalOrders: 3,
    createdBy: dispatcherKandy._id
  });

  // Trip for luqmandriver@gmail.com
  const kandyTripRef = 'TRIP-KAN-LIVE-01';
  await Trip.deleteOne({ tripRef: kandyTripRef });
  await Delivery.deleteMany({ tripRef: kandyTripRef });

  const kandyTripOutlets = kandyOutlets.slice(0, 3);
  const kandyTripOrders = [];
  for (let i = 0; i < kandyTripOutlets.length; i++) {
    const out = kandyTripOutlets[i];
    const ordRef = `ORD-KAN-TRIP-0${i + 1}`;
    await Order.deleteOne({ orderRef: ordRef });
    const ord = await Order.create({
      orderRef: ordRef,
      outlet: out._id,
      brand: 'Fresh',
      requestedDeliveryDate: new Date('2026-10-05T00:00:00.000Z'),
      tempRequirement: 'chilled',
      orderUnits: 6,
      orderWeightKg: 90,
      orderVolumeM3: 0.6,
      status: 'SCHEDULED',
      createdBy: dispatcherKandy._id
    });
    kandyTripOrders.push({ order: ord, stopSequence: i + 1, estimatedArrival: new Date(Date.now() + (i + 1) * 35 * 60000) });
  }

  const kandyTrip = await Trip.create({
    tripRef: kandyTripRef,
    plan: kandyPlan._id,
    vehicle: kandyReeferVan._id,
    driver: driverKandy._id,
    tripNumber: 1,
    brand: 'Fresh',
    district: 'Kandy',
    status: 'IN_PROGRESS',
    orders: kandyTripOrders.map(o => ({
      order: o.order._id,
      stopSequence: o.stopSequence,
      estimatedArrival: o.estimatedArrival
    })),
    totalWeightKg: 270,
    totalVolumeM3: 1.8,
    estimatedMinutes: 160,
    estimatedDistanceKm: 34,
    startTime: new Date()
  });

  // Create deliveries for Kandy Driver
  for (const item of kandyTripOrders) {
    await Delivery.create({
      deliveryRef: `DEL-${item.order.orderRef}-1`,
      order: item.order._id,
      trip: kandyTrip._id,
      driver: driverKandy._id,
      outlet: item.order.outlet,
      stopSequence: item.stopSequence,
      plannedArrival: item.estimatedArrival,
      status: 'PENDING',
      syncStatus: 'SYNCED'
    });
  }

  // 3. Set up ACTIVE PUBLISHED TRIP FOR PELIYAGODA DRIVER (driver@waypoint.lk)
  const pelPlan = await DeliveryPlan.findOne({ depot: 'Peliyagoda', status: 'PUBLISHED' }) || await DeliveryPlan.create({
    planRef: 'PLAN-PEL-20261005-PUB',
    deliveryDate: new Date('2026-10-05T00:00:00.000Z'),
    depot: 'Peliyagoda',
    status: 'PUBLISHED',
    publishedAt: new Date(),
    totalOrders: 3,
    createdBy: dispatcherPel._id
  });

  const pelTripRef = 'TRIP-PEL-LIVE-01';
  await Trip.deleteOne({ tripRef: pelTripRef });

  const pelTripOutlets = peliyagodaOutlets.slice(0, 3);
  const pelTripOrders = [];
  for (let i = 0; i < pelTripOutlets.length; i++) {
    const out = pelTripOutlets[i];
    const ordRef = `ORD-PEL-TRIP-0${i + 1}`;
    await Order.deleteOne({ orderRef: ordRef });
    const ord = await Order.create({
      orderRef: ordRef,
      outlet: out._id,
      brand: 'Style',
      requestedDeliveryDate: new Date('2026-10-05T00:00:00.000Z'),
      tempRequirement: 'ambient',
      orderUnits: 10,
      orderWeightKg: 180,
      orderVolumeM3: 1.2,
      status: 'SCHEDULED',
      createdBy: dispatcherPel._id
    });
    pelTripOrders.push({ order: ord, stopSequence: i + 1, estimatedArrival: new Date(Date.now() + (i + 1) * 30 * 60000) });
  }

  const pelTrip = await Trip.create({
    tripRef: pelTripRef,
    plan: pelPlan._id,
    vehicle: pelTruck._id,
    driver: driverPel._id,
    tripNumber: 1,
    brand: 'Style',
    district: 'Colombo',
    status: 'IN_PROGRESS',
    orders: pelTripOrders.map(o => ({
      order: o.order._id,
      stopSequence: o.stopSequence,
      estimatedArrival: o.estimatedArrival
    })),
    totalWeightKg: 540,
    totalVolumeM3: 3.6,
    estimatedMinutes: 180,
    estimatedDistanceKm: 42,
    startTime: new Date()
  });

  for (const item of pelTripOrders) {
    await Delivery.create({
      deliveryRef: `DEL-${item.order.orderRef}-1`,
      order: item.order._id,
      trip: pelTrip._id,
      driver: driverPel._id,
      outlet: item.order.outlet,
      stopSequence: item.stopSequence,
      plannedArrival: item.estimatedArrival,
      status: 'PENDING',
      syncStatus: 'SYNCED'
    });
  }

  console.log('Driver live routes created successfully for both drivers!');
  console.log(`- Kandy Driver (luqmandriver@gmail.com): Trip ${kandyTripRef} with 3 stops`);
  console.log(`- Peliyagoda Driver (driver@waypoint.lk): Trip ${pelTripRef} with 3 stops`);

  await mongoose.disconnect();
  console.log('DONE!');
}

seedDemoData().catch(err => {
  console.error(err);
  process.exit(1);
});
