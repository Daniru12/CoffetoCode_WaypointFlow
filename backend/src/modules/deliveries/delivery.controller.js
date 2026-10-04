const Delivery = require('./delivery.model');
const Trip = require('../trips/trip.model');
const Order = require('../orders/order.model');
const Vehicle = require('../vehicles/vehicle.model');
const User = require('../users/user.model');
const ProofOfDelivery = require('../pod/proofOfDelivery.model');
const Receipt = require('../receipts/receipt.model');
const Issue = require('../issues/issue.model');
const DriverLocation = require('../tracking/driverLocation.model');
const Deferral = require('../deferrals/deferral.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');
const storageService = require('../../services/storage.service');
const { getNextSuggestedRun } = require('../../utils/time.util');

/**
 * Get driver routes and assigned trips for today
 * GET /api/v1/driver/routes/today
 */
const getDriverRoutesToday = asyncHandler(async (req, res) => {
  const driverId = req.user._id;
  const userDepot = req.user.depot ? req.user.depot.trim() : null;
  const userAssignedVehicle = req.user.assignedVehicle;

  // 1. Check trips directly assigned to driver, or assigned to driver's linked vehicle
  const driverQuery = [{ driver: driverId }];
  if (userAssignedVehicle) {
    driverQuery.push({ vehicle: userAssignedVehicle });
  }

  let trips = await Trip.find({
    $or: driverQuery,
    status: { $in: ['READY', 'IN_PROGRESS', 'IN_TRANSIT', 'READY_FOR_LOADING'] }
  })
    .populate('vehicle plan')
    .populate({
      path: 'orders.order',
      populate: { path: 'outlet' }
    })
    .sort({ tripNumber: 1 });

  // 2. If no directly linked trips, check unassigned trips available at driver's depot or all published runs
  if (trips.length === 0) {
    const unassignedTrips = await Trip.find({
      driver: null,
      status: { $in: ['READY', 'IN_PROGRESS', 'IN_TRANSIT', 'READY_FOR_LOADING'] }
    })
      .populate('vehicle plan')
      .populate({
        path: 'orders.order',
        populate: { path: 'outlet' }
      })
      .sort({ tripNumber: 1 });

    const depotMatches = unassignedTrips.filter(t => {
      if (!userDepot) return true;
      const vDepot = t.vehicle?.depot;
      const pDepot = t.plan?.depot;
      return (vDepot && vDepot.toLowerCase() === userDepot.toLowerCase()) ||
             (pDepot && pDepot.toLowerCase() === userDepot.toLowerCase());
    });

    trips = depotMatches.length > 0 ? depotMatches : unassignedTrips;
  }

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
  const { tripId, vehicleId, type = 'VEHICLE_BREAKDOWN', description, severity = 'CRITICAL', cannotContinue } = req.body;
  const isCannotContinue = cannotContinue === true || cannotContinue === 'true';

  let trip = null;
  if (tripId) {
    trip = await Trip.findById(tripId).populate('vehicle driver');
  } else {
    trip = await Trip.findOne({
      driver: req.user._id,
      status: { $in: ['IN_TRANSIT', 'IN_PROGRESS', 'READY_FOR_LOADING', 'LOADING'] }
    }).populate('vehicle driver');
  }

  const targetVehicleId = vehicleId || (trip ? (trip.vehicle?._id || trip.vehicle) : null);

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
    description: `${description || 'Vehicle breakdown on route'}${isCannotContinue ? ' [CANNOT CONTINUE - REASSIGNMENT REQUESTED]' : ''}`,
    evidenceUrls,
    severity: isCannotContinue ? 'CRITICAL' : severity,
    status: 'OPEN'
  });

  if (targetVehicleId) {
    await Vehicle.findByIdAndUpdate(targetVehicleId, { status: 'UNAVAILABLE' });
  }

  if (trip) {
    trip.status = 'INTERRUPTED';

    if (isCannotContinue) {
      trip.atRisk = true;

      // 1. Mark remaining stops "At Risk"
      const remainingDeliveries = await Delivery.find({
        trip: trip._id,
        status: { $in: ['PENDING', 'ARRIVED'] }
      }).populate('order outlet');

      for (const d of remainingDeliveries) {
        d.status = 'AT_RISK';
        d.isAtRisk = true;
        await d.save();
      }

      // Calculate payload demand for remaining stops
      const remainingWeightKg = remainingDeliveries.reduce((sum, d) => sum + (d.order?.orderWeightKg || 0), 0);
      const remainingVolumeM3 = remainingDeliveries.reduce((sum, d) => sum + (d.order?.orderVolumeM3 || 0), 0);
      const hasChilled = remainingDeliveries.some(d => d.order?.tempRequirement === 'chilled' || trip.brand === 'Fresh');
      const hasVanOnly = remainingDeliveries.some(d => d.outlet?.parkingConstraint === 'van_only');

      const originalVehicle = trip.vehicle?.vehicleId ? trip.vehicle : await Vehicle.findById(trip.vehicle);
      const depot = originalVehicle?.depot || 'Peliyagoda';

      // 2. Automatically find best replacement vehicle
      const candidateFilter = {
        _id: { $ne: targetVehicleId },
        depot,
        status: 'AVAILABLE',
        weightCapKg: { $gte: remainingWeightKg },
        volumeCapM3: { $gte: remainingVolumeM3 }
      };

      if (hasChilled) {
        candidateFilter.temp = 'reefer';
      }
      if (hasVanOnly) {
        candidateFilter.type = 'van';
      }

      let replacementVehicle = await Vehicle.findOne(candidateFilter).sort({ weeklyFuelQuotaL: -1 });

      if (!replacementVehicle && !hasVanOnly) {
        replacementVehicle = await Vehicle.findOne({
          _id: { $ne: targetVehicleId },
          status: 'AVAILABLE',
          weightCapKg: { $gte: remainingWeightKg },
          volumeCapM3: { $gte: remainingVolumeM3 },
          ...(hasChilled ? { temp: 'reefer' } : {})
        }).sort({ weeklyFuelQuotaL: -1 });
      }

      if (replacementVehicle) {
        // Find replacement driver: linked driver or depot driver
        let replacementDriver = null;
        if (replacementVehicle.assignedDriver) {
          replacementDriver = await User.findById(replacementVehicle.assignedDriver);
        }
        if (!replacementDriver) {
          replacementDriver = await User.findOne({
            role: 'DRIVER',
            depot: replacementVehicle.depot,
            _id: { $ne: req.user._id }
          });
        }

        // Updated ETAs for remaining stops starting +30m response
        const now = new Date();
        const updatedStops = remainingDeliveries.map((del, idx) => {
          const eta = new Date(now.getTime() + (30 + (idx + 1) * 25) * 60000);
          return {
            deliveryId: del._id,
            orderId: del.order?._id,
            orderRef: del.order?.orderRef,
            outletName: del.outlet?.name,
            stopSequence: idx + 1,
            estimatedArrival: eta
          };
        });

        const stockTransferNote = `Stock transfer required from disabled ${originalVehicle?.vehicleId || 'ORIGINAL'} to ${replacementVehicle.vehicleId}. Total load: ${remainingWeightKg}kg / ${remainingVolumeM3.toFixed(1)}m³ across ${remainingDeliveries.length} retail outlets. ${hasChilled ? 'Cold chain reefer integrity (< 4°C) must be preserved.' : ''}`;

        trip.reassignmentTemplate = {
          status: 'PROPOSED',
          proposedAt: new Date(),
          originalTripId: trip._id,
          originalVehicle: {
            _id: originalVehicle?._id,
            vehicleId: originalVehicle?.vehicleId,
            type: originalVehicle?.type,
            temp: originalVehicle?.temp
          },
          replacementVehicle: {
            _id: replacementVehicle._id,
            vehicleId: replacementVehicle.vehicleId,
            type: replacementVehicle.type,
            temp: replacementVehicle.temp,
            weightCapKg: replacementVehicle.weightCapKg,
            volumeCapM3: replacementVehicle.volumeCapM3,
            depot: replacementVehicle.depot
          },
          replacementDriver: replacementDriver ? {
            _id: replacementDriver._id,
            name: replacementDriver.name,
            phone: replacementDriver.phone
          } : null,
          remainingOrders: updatedStops,
          remainingWeightKg,
          remainingVolumeM3,
          stockTransferNote,
          cannotContinue: true,
          reason: `Driver reported ${type}: ${description || 'Cannot continue delivery run'}`
        };
      } else {
        // No vehicle available: auto-defer remaining orders
        trip.reassignmentTemplate = {
          status: 'NO_VEHICLE_AVAILABLE',
          proposedAt: new Date(),
          originalTripId: trip._id,
          originalVehicle: {
            _id: originalVehicle?._id,
            vehicleId: originalVehicle?.vehicleId
          },
          replacementVehicle: null,
          replacementDriver: null,
          remainingOrders: remainingDeliveries.map(d => ({
            deliveryId: d._id,
            orderId: d.order?._id,
            orderRef: d.order?.orderRef,
            outletName: d.outlet?.name
          })),
          cannotContinue: true,
          reason: 'No replacement fleet vehicle available with required temperature and payload capacity.'
        };

        for (const del of remainingDeliveries) {
          if (!del.order) continue;
          const order = await Order.findById(del.order._id || del.order);
          if (order) {
            const prevCount = order.deferredCount || 0;
            order.status = 'DEFERRED';
            order.deferredCount = prevCount + 1;
            order.lastDeferredAt = new Date();
            await order.save();

            await Deferral.create({
              order: order._id,
              plan: trip.plan,
              reasonCode: 'VEHICLE_BREAKDOWN',
              reason: `Breakdown disruption: ${type}. Zero replacement vehicles available at ${depot} depot.`,
              deferredBy: req.user._id,
              deferredAt: new Date(),
              nextSuggestedRun: getNextSuggestedRun(order.requestedDeliveryDate),
              previousDeferralCount: prevCount
            });
          }
        }
      }
    }

    await trip.save();
  }

  socketService.emitVehicleBreakdown({
    issue,
    trip,
    reassignmentTemplate: trip?.reassignmentTemplate,
    cannotContinue: isCannotContinue
  });

  res.status(201).json(new ApiResponse(201, {
    issue,
    reassignmentTemplate: trip?.reassignmentTemplate
  }, isCannotContinue ? 'Critical breakdown recorded; stops flagged At Risk and replacement vehicle computed' : 'Vehicle issue reported; dispatcher alerted'));
});

/**
 * Get authenticated driver profile with license validation & operational metrics
 * GET /api/v1/driver/profile
 */
const getDriverProfile = asyncHandler(async (req, res) => {
  const driverId = req.user._id;

  const driver = await User.findById(driverId)
    .populate('assignedVehicle')
    .select('-password');

  if (!driver) {
    return res.status(404).json(new ApiResponse(404, null, 'Driver not found'));
  }

  // Calculate driver statistics
  const totalTrips = await Trip.countDocuments({ driver: driverId });
  const completedTrips = await Trip.countDocuments({ driver: driverId, status: 'COMPLETED' });
  const totalDeliveries = await Delivery.countDocuments({ driver: driverId });
  const completedDeliveries = await Delivery.countDocuments({ driver: driverId, status: 'DELIVERED' });

  // License compliance status
  let licenseStatus = 'VALID';
  let daysToExpiry = null;

  if (!driver.licenseNumber) {
    licenseStatus = 'MISSING';
  } else if (driver.licenseExpiryDate) {
    const diffMs = new Date(driver.licenseExpiryDate).getTime() - Date.now();
    daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysToExpiry < 0) {
      licenseStatus = 'EXPIRED';
    } else if (daysToExpiry <= 30) {
      licenseStatus = 'EXPIRING_SOON';
    }
  }

  const responseData = {
    profile: driver,
    compliance: {
      licenseStatus,
      daysToExpiry,
      hasValidLicense: licenseStatus === 'VALID' || licenseStatus === 'EXPIRING_SOON'
    },
    metrics: {
      totalTrips,
      completedTrips,
      totalDeliveries,
      completedDeliveries,
      deliverySuccessRate: totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 100
    }
  };

  res.status(200).json(new ApiResponse(200, responseData, 'Driver profile retrieved'));
});

/**
 * Update authenticated driver self-service profile (phone, emergency contact, license)
 * PUT /api/v1/driver/profile
 */
const updateDriverProfile = asyncHandler(async (req, res) => {
  const driverId = req.user._id;
  const { phone, emergencyContact, licenseNumber, licenseCategory, licenseExpiryDate } = req.body;

  const driver = await User.findById(driverId);
  if (!driver) {
    return res.status(404).json(new ApiResponse(404, null, 'Driver not found'));
  }

  if (phone !== undefined) driver.phone = phone;
  if (emergencyContact !== undefined) driver.emergencyContact = emergencyContact;
  if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber;
  if (licenseCategory !== undefined) driver.licenseCategory = licenseCategory;
  if (licenseExpiryDate !== undefined) driver.licenseExpiryDate = licenseExpiryDate;

  await driver.save();

  const updated = await User.findById(driverId).populate('assignedVehicle').select('-password');
  res.status(200).json(new ApiResponse(200, updated, 'Profile updated successfully'));
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
  reportVehicleIssue,
  getDriverProfile,
  updateDriverProfile
};
