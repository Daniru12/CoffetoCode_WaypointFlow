const DriverLocation = require('./driverLocation.model');
const Trip = require('../trips/trip.model');
const Vehicle = require('../vehicles/vehicle.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');

/**
 * Get latest live coordinates of all active vehicles/drivers
 * GET /api/v1/tracking/live
 */
const getLiveTracking = asyncHandler(async (req, res) => {
  const activeTrips = await Trip.find({ status: { $in: ['IN_TRANSIT', 'IN_PROGRESS'] } })
    .populate('vehicle driver plan');

  const liveFleet = [];

  for (const trip of activeTrips) {
    let latestLoc = null;
    if (trip.driver) {
      latestLoc = await DriverLocation.findOne({ driver: trip.driver._id }).sort({ recordedAt: -1 });
    }

    liveFleet.push({
      tripId: trip._id,
      tripRef: trip.tripRef,
      vehicle: trip.vehicle,
      driver: trip.driver,
      status: trip.status,
      latestLocation: latestLoc || {
        latitude: 6.9271, // default Colombo center coordinates if not yet emitted
        longitude: 79.8612,
        recordedAt: trip.startedAt || trip.updatedAt
      }
    });
  }

  res.status(200).json(new ApiResponse(200, liveFleet, `Live tracking: ${liveFleet.length} active fleet units`));
});

/**
 * Get route trail history for a specific trip
 * GET /api/v1/tracking/trips/:tripId
 */
const getTripTracking = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const trip = await Trip.findOne({
    $or: [{ tripRef: tripId }, ...(tripId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: tripId }] : [])]
  }).populate('vehicle driver');

  if (!trip) {
    return res.status(404).json(new ApiResponse(404, null, 'Trip not found'));
  }

  const trail = await DriverLocation.find({ trip: trip._id })
    .sort({ recordedAt: 1 })
    .limit(100);

  res.status(200).json(new ApiResponse(200, { trip, trail }, 'Trip location trail retrieved'));
});

/**
 * Record location point
 * POST /api/v1/tracking/location
 */
const recordLocation = asyncHandler(async (req, res) => {
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

module.exports = {
  getLiveTracking,
  getTripTracking,
  recordLocation
};
