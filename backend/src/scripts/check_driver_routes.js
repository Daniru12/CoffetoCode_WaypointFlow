const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('../modules/users/user.model');
const Outlet = require('../modules/outlets/outlet.model');
const Order = require('../modules/orders/order.model');
const Vehicle = require('../modules/vehicles/vehicle.model');
const DeliveryPlan = require('../modules/planning/deliveryPlan.model');
const Trip = require('../modules/trips/trip.model');
const Delivery = require('../modules/deliveries/delivery.model');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const driver = await User.findOne({ email: 'luqmandriver@gmail.com' });
  const trips = await Trip.find({ driver: driver._id, status: { $in: ['READY', 'IN_PROGRESS', 'IN_TRANSIT', 'READY_FOR_LOADING'] } })
    .populate('vehicle plan')
    .populate({ path: 'orders.order', populate: { path: 'outlet' } });
  console.log('Driver trips found for luqmandriver@gmail.com:', trips.length);
  trips.forEach(t => {
    console.log(t.tripRef, 'status:', t.status, 'stops:', t.orders.length, 'vehicle:', t.vehicle?.vehicleId, t.vehicle?.type);
    t.orders.forEach(o => {
      console.log('   Stop', o.stopSequence, 'outlet:', o.order?.outlet?.name, 'brand:', o.order?.brand, 'weight:', o.order?.orderWeightKg);
    });
  });

  const deliveries = await Delivery.find({ driver: driver._id }).populate('outlet order');
  console.log('Driver deliveries found:', deliveries.length);
  deliveries.forEach(d => {
    console.log(' - Delivery', d.deliveryRef, 'stop:', d.stopSequence, 'outlet:', d.outlet?.name, 'status:', d.status);
  });

  await mongoose.disconnect();
}
check();
