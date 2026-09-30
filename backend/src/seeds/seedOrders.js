const Order = require('../modules/orders/order.model');
const Outlet = require('../modules/outlets/outlet.model');
const User = require('../modules/users/user.model');

async function seedOrders() {
  console.log('Seeding Sample Orders...');

  const storeManager = await User.findOne({ role: 'STORE_MANAGER' });
  const outlets = await Outlet.find({ depot: 'Peliyagoda' }).limit(5);

  if (!outlets || outlets.length === 0) {
    console.log('No outlets found to attach orders. Skipping order seeding.');
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const sampleOrders = [
    {
      orderRef: 'ORD-OUT001-TEST01',
      outlet: outlets[0]._id,
      brand: outlets[0].brand,
      requestedDeliveryDate: tomorrow,
      tempRequirement: outlets[0].brand === 'Fresh' ? 'chilled' : 'ambient',
      items: [
        { itemName: 'Fresh Dairy Crates', qty: 25, unit: 'crates', weightKg: 250, volumeM3: 1.2 },
        { itemName: 'Chilled Yogurt Trays', qty: 30, unit: 'trays', weightKg: 150, volumeM3: 0.8 }
      ],
      orderUnits: 55,
      orderWeightKg: 400,
      orderVolumeM3: 2.0,
      deliveryWindow: { start: '06:00', end: '08:00' },
      status: 'CONFIRMED',
      createdBy: storeManager ? storeManager._id : null
    },
    {
      orderRef: 'ORD-OUT002-TEST02',
      outlet: outlets[1] ? outlets[1]._id : outlets[0]._id,
      brand: outlets[1] ? outlets[1].brand : outlets[0].brand,
      requestedDeliveryDate: tomorrow,
      tempRequirement: 'ambient',
      items: [
        { itemName: 'Organic Grains & Pulses', qty: 40, unit: 'sacks', weightKg: 800, volumeM3: 2.5 }
      ],
      orderUnits: 40,
      orderWeightKg: 800,
      orderVolumeM3: 2.5,
      deliveryWindow: { start: '07:00', end: '10:00' },
      status: 'CONFIRMED',
      createdBy: storeManager ? storeManager._id : null
    },
    {
      orderRef: 'ORD-OUT003-TEST03',
      outlet: outlets[2] ? outlets[2]._id : outlets[0]._id,
      brand: outlets[2] ? outlets[2].brand : outlets[0].brand,
      requestedDeliveryDate: tomorrow,
      tempRequirement: 'ambient',
      items: [
        { itemName: 'Designer Apparel Cartons', qty: 20, unit: 'cartons', weightKg: 300, volumeM3: 3.0 }
      ],
      orderUnits: 20,
      orderWeightKg: 300,
      orderVolumeM3: 3.0,
      deliveryWindow: { start: '06:00', end: '08:00' },
      status: 'CONFIRMED',
      createdBy: storeManager ? storeManager._id : null
    }
  ];

  for (const o of sampleOrders) {
    if (!o.createdBy) {
      const anyUser = await User.findOne({});
      o.createdBy = anyUser ? anyUser._id : null;
    }
    await Order.findOneAndUpdate({ orderRef: o.orderRef }, o, { upsert: true, new: true });
  }

  console.log(`Seeded ${sampleOrders.length} test orders.`);
}

module.exports = seedOrders;
