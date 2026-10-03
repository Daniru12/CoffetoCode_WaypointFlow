const Delivery = require('./delivery.model');
const Trip = require('../trips/trip.model');
const Order = require('../orders/order.model');
const Vehicle = require('../vehicles/vehicle.model');
const ProofOfDelivery = require('../pod/proofOfDelivery.model');
const Receipt = require('../receipts/receipt.model');
const Issue = require('../issues/issue.model');
const DriverLocation = require('../tracking/driverLocation.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');
const storageService = require('../../services/storage.service');

/**
 * Get driver routes and assigned trips for today
 * GET /api/v1/driver/routes/today
 */
const getDriverRoutesToday = asyncHandler(async (req, res) => {
  const driverId = req.user._id;

  const trips = await Trip.find({
    driver: driverId,
    status: { $in: ['READY', 'IN_PROGRESS', 'IN_TRANSIT', 'READY_FOR_LOADING'] }
  })
    .populate('vehicle plan')
    .populate({
      path: 'orders.order',
      populate: { path: 'outlet' }
    })
    .sort({ tripNumber: 1 });

  res.status(200).json(new ApiResponse(200, trips, `Retrieved ${trips.length} active routes`));
});

/**
 * Get trip details by tripId
 * GET /api/v1/driver/trips/:tripId
 */
const getDriverTripById = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  })
    .populate('vehicle plan')
    .populate({
      path: 'orders.order',
      populate: { path: 'outlet' }
    });

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  res.status(200).json(new ApiResponse(200, trip, 'Trip retrieved'));
});

/**
 * Get stops for a trip
 * GET /api/v1/driver/trips/:tripId/stops
 */
const getTripStops = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  });

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  const deliveries = await Delivery.find({ trip: trip._id })
    .populate('order outlet')
    .sort({ stopSequence: 1 });

  res.status(200).json(new ApiResponse(200, deliveries, `Retrieved ${deliveries.length} stops`));
});

/**
 * Mark arrival at outlet stop
 * POST /api/v1/deliveries/:deliveryId/arrive
 */
const arriveDelivery = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const delivery = await Delivery.findById(deliveryId).populate('order outlet trip');

  if (!delivery) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery not found'));
  }

  delivery.status = 'ARRIVED';
  delivery.actualArrival = new Date();
  await delivery.save();

  // Update order status
  if (delivery.order) {
    await Order.findByIdAndUpdate(delivery.order._id, { status: 'OUT_FOR_DELIVERY' });
  }

  // Update trip status to IN_TRANSIT if not already
  if (delivery.trip) {
    await Trip.findByIdAndUpdate(delivery.trip._id, {
      status: 'IN_TRANSIT',
      startedAt: delivery.trip.startedAt || new Date()
    });
    socketService.emitTripStarted(delivery.trip);
  }

  socketService.emitDeliveryArrived(delivery);

  res.status(200).json(new ApiResponse(200, delivery, 'Arrival recorded'));
});

/**
 * Complete delivery stop
 * POST /api/v1/deliveries/:deliveryId/complete
 */
const completeDelivery = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { deliveredQuantity } = req.body;

  const delivery = await Delivery.findById(deliveryId).populate('order outlet trip');
  if (!delivery) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery not found'));
  }

  delivery.status = 'DELIVERED';
  delivery.completedAt = new Date();
  if (deliveredQuantity !== undefined) delivery.deliveredQuantity = deliveredQuantity;
  await delivery.save();

  if (delivery.order) {
    await Order.findByIdAndUpdate(delivery.order._id, { status: 'DELIVERED' });
  }

  socketService.emitDeliveryCompleted(delivery);

  // Check if all deliveries for this trip are completed
  const remaining = await Delivery.countDocuments({
    trip: delivery.trip._id,
    status: { $in: ['PENDING', 'ARRIVED'] }
  });

  if (remaining === 0) {
    await Trip.findByIdAndUpdate(delivery.trip._id, {
      status: 'COMPLETED',
      completedAt: new Date()
    });
    if (delivery.trip.vehicle) {
      await Vehicle.findByIdAndUpdate(delivery.trip.vehicle, { status: 'AVAILABLE' });
    }
  }

  res.status(200).json(new ApiResponse(200, delivery, 'Delivery stop completed'));
});

/**
 * Fail delivery stop (outlet closed, blocked, etc.)
 * POST /api/v1/deliveries/:deliveryId/fail
 */
const failDelivery = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { reason, reasonCode = 'DELIVERY_REJECTED' } = req.body;

  const delivery = await Delivery.findById(deliveryId).populate('order outlet trip');
  if (!delivery) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery not found'));
  }

  delivery.status = 'FAILED';
  delivery.completedAt = new Date();
  await delivery.save();

  if (delivery.order) {
    await Order.findByIdAndUpdate(delivery.order._id, { status: 'ISSUE_REPORTED' });
  }

  // Create Issue
  const issueRef = `ISS-FL-${Date.now().toString().slice(-6)}`;
  await Issue.create({
    issueRef,
    type: reasonCode,
    source: 'DRIVER',
    delivery: delivery._id,
    order: delivery.order?._id,
    trip: delivery.trip?._id,
    reportedBy: req.user._id,
    description: reason || 'Delivery failed at stop',
    severity: 'HIGH',
    status: 'OPEN'
  });

  socketService.emitDeliveryFailed({ delivery, reason });
  await auditService.log({
    user: req.user,
    action: 'DELIVERY_FAILED',
    entityType: 'Delivery',
    entityId: delivery._id,
    reason: `[${reasonCode}] ${reason}`
  });

  res.status(200).json(new ApiResponse(200, delivery, 'Delivery marked as failed'));
});

/**
 * Submit Proof of Delivery (Signatures + Photo URLs)
 * POST /api/v1/deliveries/:deliveryId/pod
 */
const submitPod = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { receiverName, receivedQuantity, latitude, longitude } = req.body;

  const delivery = await Delivery.findById(deliveryId).populate('order outlet trip');
  if (!delivery) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery not found'));
  }

  let signatureUrl = req.body.signatureUrl || null;
  const photoUrls = req.body.photoUrls ? (Array.isArray(req.body.photoUrls) ? req.body.photoUrls : [req.body.photoUrls]) : [];

  // Handle uploaded files via Multer
  if (req.files) {
    if (req.files.signature && req.files.signature[0]) {
      const sigFile = req.files.signature[0];
      signatureUrl = await storageService.uploadFile(sigFile.buffer, sigFile.originalname, sigFile.mimetype, 'signatures');
    }
    if (req.files.photos && req.files.photos.length > 0) {
      for (const p of req.files.photos) {
        const url = await storageService.uploadFile(p.buffer, p.originalname, p.mimetype, 'proof-of-delivery');
        photoUrls.push(url);
      }
    }
  }

  const pod = await ProofOfDelivery.findOneAndUpdate(
    { delivery: delivery._id },
    {
      delivery: delivery._id,
      receiverName: receiverName || 'Store Representative',
      receivedQuantity: Number(receivedQuantity) || delivery.order?.orderUnits || 1,
      signatureUrl,
      photoUrls,
      timestamp: new Date(),
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    },
    { upsert: true, new: true }
  );

  delivery.status = 'DELIVERED';
  delivery.deliveredQuantity = pod.receivedQuantity;
  delivery.completedAt = new Date();
  await delivery.save();

  if (delivery.order) {
    await Order.findByIdAndUpdate(delivery.order._id, { status: 'DELIVERED' });
  }

  socketService.emitDeliveryCompleted(delivery);

  res.status(201).json(new ApiResponse(201, { pod, delivery }, 'Proof of delivery submitted successfully'));
});

/**
 * Get delivery details by ID
 * GET /api/v1/deliveries/:deliveryId
 */
const getDeliveryById = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const delivery = await Delivery.findById(deliveryId)
    .populate('order outlet driver')
    .populate({
      path: 'trip',
      populate: { path: 'vehicle' }
    });

  if (!delivery) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery not found'));
  }

  const pod = await ProofOfDelivery.findOne({ delivery: delivery._id });
  const receipt = await Receipt.findOne({ delivery: delivery._id });

  res.status(200).json(new ApiResponse(200, { delivery, pod, receipt }, 'Delivery retrieved'));
});

/**
 * Store Manager Receipt Confirmation
 * POST /api/v1/deliveries/:deliveryId/receipt
 */
const confirmReceipt = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { expectedQuantity, receivedQuantity, condition = 'GOOD', discrepancy = 0, notes } = req.body;

  const delivery = await Delivery.findById(deliveryId).populate('order outlet');
  if (!delivery) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery not found'));
  }

  const evidenceUrls = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const url = await storageService.uploadFile(f.buffer, f.originalname, f.mimetype, 'delivery-issues');
      evidenceUrls.push(url);
    }
  }

  const receipt = await Receipt.create({
    delivery: delivery._id,
    order: delivery.order?._id,
    outlet: delivery.outlet?._id,
    confirmedBy: req.user._id,
    expectedQuantity: Number(expectedQuantity) || delivery.deliveredQuantity || 1,
    receivedQuantity: Number(receivedQuantity) || delivery.deliveredQuantity || 1,
    condition,
    discrepancy: Number(discrepancy) || 0,
    notes,
    evidenceUrls,
    confirmedAt: new Date()
  });

  if (delivery.order) {
    await Order.findByIdAndUpdate(delivery.order._id, {
      status: (Number(discrepancy) > 0 || condition === 'DAMAGED') ? 'ISSUE_REPORTED' : 'CLOSED'
    });
  }

  await auditService.log({
    user: req.user,
    action: 'RECEIPT_CONFIRMED',
    entityType: 'Receipt',
    entityId: receipt._id,
    reason: notes,
    newData: receipt
  });

  res.status(201).json(new ApiResponse(201, receipt, 'Receipt confirmed successfully'));
});

/**
 * Report an issue from delivery stop (Store Manager or Driver)
 * POST /api/v1/deliveries/:deliveryId/issues
 */
const reportDeliveryIssue = asyncHandler(async (req, res) => {
  const { deliveryId } = req.params;
  const { type, description, quantity, severity = 'MEDIUM' } = req.body;

  const delivery = await Delivery.findById(deliveryId).populate('order outlet trip');
  if (!delivery) {
    return res.status(404).json(new ApiResponse(404, null, 'Delivery not found'));
  }

  const evidenceUrls = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const url = await storageService.uploadFile(f.buffer, f.originalname, f.mimetype, 'delivery-issues');
      evidenceUrls.push(url);
    }
  }

  const issueRef = `ISS-DL-${Date.now().toString().slice(-6)}`;
  const issue = await Issue.create({
    issueRef,
    type,
    source: req.user.role,
    order: delivery.order?._id,
    delivery: delivery._id,
    trip: delivery.trip?._id,
    reportedBy: req.user._id,
    description,
    quantity: Number(quantity) || 0,
    evidenceUrls,
    severity,
    status: 'OPEN'
  });

  await auditService.log({
    user: req.user,
    action: 'ISSUE_REPORTED',
    entityType: 'Issue',
    entityId: issue._id,
    newData: issue
  });

  res.status(201).json(new ApiResponse(201, issue, 'Delivery issue reported'));
});

/**
 * Record driver GPS location
 * POST /api/v1/driver/location
 */
const recordDriverLocation = asyncHandler(async (req, res) => {
  const { tripId, vehicleId, latitude, longitude, speed, heading } = req.body;

  const loc = await DriverLocation.create({
    driver: req.user._id,
    trip: tripId || null,
    vehicle: vehicleId || null,
    latitude: Number(latitude),
    longitude: Number(longitude),
    speed: speed ? Number(speed) : undefined,
    heading: heading ? Number(heading) : undefined,
    recordedAt: new Date()
  });

  socketService.emitDriverLocation(loc);

  res.status(201).json(new ApiResponse(201, loc, 'Location recorded'));
});

/**
 * Report vehicle issue / breakdown
 * POST /api/v1/driver/vehicle-issue
 */
const reportVehicleIssue = asyncHandler(async (req, res) => {
  const { tripId, vehicleId, type = 'VEHICLE_BREAKDOWN', description, severity = 'CRITICAL' } = req.body;

  let trip = null;
  if (tripId) trip = await Trip.findById(tripId);

  const targetVehicleId = vehicleId || (trip ? trip.vehicle : null);

  const evidenceUrls = [];
  if (req.files && req.files.length > 0) {
    for (const f of req.files) {
      const url = await storageService.uploadFile(f.buffer, f.originalname, f.mimetype, 'vehicle-incidents');
      evidenceUrls.push(url);
    }
  }

  const issueRef = `ISS-VB-${Date.now().toString().slice(-6)}`;
  const issue = await Issue.create({
    issueRef,
    type,
    source: 'DRIVER',
    trip: trip ? trip._id : null,
    vehicle: targetVehicleId,
    reportedBy: req.user._id,
    description: description || 'Vehicle breakdown on route',
    evidenceUrls,
    severity,
    status: 'OPEN'
  });

  if (targetVehicleId) {
    await Vehicle.findByIdAndUpdate(targetVehicleId, { status: 'UNAVAILABLE' });
  }

  if (trip) {
    trip.status = 'INTERRUPTED';
    await trip.save();
  }

  socketService.emitVehicleBreakdown(issue);

  res.status(201).json(new ApiResponse(201, issue, 'Vehicle breakdown reported; dispatcher alerted'));
});

module.exports = {
  getDriverRoutesToday,
  getDriverTripById,
  getTripStops,
  arriveDelivery,
  completeDelivery,
  failDelivery,
  submitPod,
  getDeliveryById,
  confirmReceipt,
  reportDeliveryIssue,
  recordDriverLocation,
  reportVehicleIssue
};
