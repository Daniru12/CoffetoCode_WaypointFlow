const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Order = require('../modules/orders/order.model');
const Outlet = require('../modules/outlets/outlet.model');
const DeliveryPlan = require('../modules/planning/deliveryPlan.model');
const Trip = require('../modules/trips/trip.model');
const User = require('../modules/users/user.model');
const Delivery = require('../modules/deliveries/delivery.model');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const plan = await DeliveryPlan.findOne({ planRef: 'PLAN-PEL-20261005-03' });
  console.log('Plan:', plan?.planRef, plan?.depot, plan?.deliveryDate);
  
  const startOfDay = new Date(plan.deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(plan.deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const activeTrips = await Trip.find({
    status: { $in: ['READY', 'READY_FOR_LOADING', 'IN_PROGRESS', 'IN_TRANSIT', 'COMPLETED'] }
  }).select('orders.order');
  const assignedOrderIds = new Set(
    activeTrips.flatMap(t => (t.orders || []).map(o => o.order ? o.order.toString() : null)).filter(Boolean)
  );

  const orders = await Order.find({
    $or: [
      { requestedDeliveryDate: { $gte: startOfDay, $lte: endOfDay } },
      { scheduledDispatchDate: { $gte: startOfDay, $lte: endOfDay } },
      { requestedDeliveryDate: { $lte: endOfDay }, status: { $in: ['CONFIRMED', 'DEFERRED'] } }
    ],
    status: { $in: ['CONFIRMED', 'PLANNING', 'DEFERRED'] }
  }).populate('outlet');

  const unallocated = orders.filter(o => 
    o.outlet && 
    o.outlet.depot === plan.depot && 
    !assignedOrderIds.has(o._id.toString())
  );
  console.log('Unallocated orders for Peliyagoda Plan on 2026-10-05:', unallocated.length);
  unallocated.forEach(o => console.log(' -', o.orderRef, o.brand, o.orderWeightKg + 'kg', o.tempRequirement));

  // Check Kandy unallocated
  const kandyPlan = await DeliveryPlan.findOne({ depot: 'Kandy' });
  const kandyUnalloc = orders.filter(o => o.outlet && o.outlet.depot === 'Kandy' && !assignedOrderIds.has(o._id.toString()));
  console.log('Unallocated orders for Kandy Depot:', kandyUnalloc.length);

  // Also check Driver route for luqmandriver@gmail.com
  const driverKandy = await User.findOne({ email: 'luqmandriver@gmail.com' });
  const driverTripsKandy = await Trip.find({ driver: driverKandy._id, status: { $in: ['READY', 'IN_PROGRESS', 'IN_TRANSIT', 'READY_FOR_LOADING'] } }).populate('orders.order');
  console.log('Kandy Driver Active Trips:', driverTripsKandy.length, driverTripsKandy.map(t => t.tripRef));

  const kandyDeliveries = await Delivery.find({ driver: driverKandy._id });
  console.log('Kandy Driver Deliveries:', kandyDeliveries.length);

  // Driver Peliyagoda
  const driverPel = await User.findOne({ email: 'driver@waypoint.lk' });
  const driverTripsPel = await Trip.find({ driver: driverPel._id, status: { $in: ['READY', 'IN_PROGRESS', 'IN_TRANSIT', 'READY_FOR_LOADING'] } }).populate('orders.order');
  console.log('Peliyagoda Driver Active Trips:', driverTripsPel.length, driverTripsPel.map(t => t.tripRef));

  await mongoose.disconnect();
}
test();
