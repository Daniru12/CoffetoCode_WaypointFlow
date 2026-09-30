const OfflineEvent = require('./offlineEvent.model');
const Delivery = require('../deliveries/delivery.model');
const Trip = require('../trips/trip.model');
const Order = require('../orders/order.model');
const ProofOfDelivery = require('../pod/proofOfDelivery.model');
const DriverLocation = require('../tracking/driverLocation.model');
const Issue = require('../issues/issue.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');
const auditService = require('../../services/audit.service');

/**
 * Bootstrap data package for offline caching (IndexedDB)
 * GET /api/v1/sync/bootstrap
 */
const bootstrapOfflineData = asyncHandler(async (req, res) => {
  const driverId = req.user._id;

  // Active trips assigned to driver
  const trips = await Trip.find({
    driver: driverId,
    status: { $in: ['READY', 'IN_PROGRESS', 'IN_TRANSIT', 'READY_FOR_LOADING'] }
  }).populate('vehicle plan');

  const tripIds = trips.map(t => t._id);

  // Deliveries on these trips
  const deliveries = await Delivery.find({ trip: { $in: tripIds } })
    .populate({
      path: 'order',
      populate: { path: 'outlet' }
    })
    .populate('outlet')
    .sort({ stopSequence: 1 });

  res.status(200).json(
    new ApiResponse(200, {
      driver: {
        id: req.user._id,
        name: req.user.name,
        depot: req.user.depot
      },
      syncedAt: new Date(),
      trips,
      deliveries
    }, 'Offline bootstrap package generated')
  );
});

/**
 * Sync offline batch events
 * POST /api/v1/sync/events
 */
const processSyncEvents = asyncHandler(async (req, res) => {
  const { deviceId, events = [] } = req.body;
  const processedResults = [];

  for (const ev of events) {
    const {
      clientEventId,
      eventType,
      entityType = 'Delivery',
      entityId,
      payload = {},
      clientTimestamp
    } = ev;

    if (!clientEventId) continue;

    // 1. Check for duplicate clientEventId (Idempotency)
    const existing = await OfflineEvent.findOne({ clientEventId });
    if (existing) {
      processedResults.push({
        clientEventId,
        status: existing.status,
        message: 'Duplicate event already processed'
      });
      continue;
    }

    let status = 'SYNCED';
    let conflictReason = null;

    try {
      // 2. Process event actions
      if (eventType === 'DELIVERY_ARRIVED') {
        const delivery = await Delivery.findById(entityId);
        if (!delivery) {
          status = 'CONFLICT';
          conflictReason = 'Delivery entity no longer exists on server';
        } else if (delivery.status === 'DELIVERED') {
          status = 'CONFLICT';
          conflictReason = 'Delivery was already marked completed online';
        } else {
          delivery.status = 'ARRIVED';
          delivery.actualArrival = clientTimestamp ? new Date(clientTimestamp) : new Date();
          delivery.syncStatus = 'SYNCED';
          await delivery.save();
        }
      } else if (eventType === 'DELIVERY_COMPLETED') {
        const delivery = await Delivery.findById(entityId).populate('order trip');
        if (!delivery) {
          status = 'CONFLICT';
          conflictReason = 'Delivery entity does not exist';
        } else {
          delivery.status = 'DELIVERED';
          delivery.completedAt = clientTimestamp ? new Date(clientTimestamp) : new Date();
          delivery.deliveredQuantity = payload.deliveredQuantity || delivery.deliveredQuantity;
          delivery.syncStatus = 'SYNCED';
          await delivery.save();

          if (delivery.order) {
            await Order.findByIdAndUpdate(delivery.order._id, { status: 'DELIVERED' });
          }
        }
      } else if (eventType === 'POD_SUBMITTED') {
        const delivery = await Delivery.findById(entityId);
        if (delivery) {
          await ProofOfDelivery.findOneAndUpdate(
            { delivery: delivery._id },
            {
              delivery: delivery._id,
              receiverName: payload.receiverName || 'Store Receiver',
              receivedQuantity: payload.receivedQuantity || 1,
              signatureUrl: payload.signatureUrl,
              photoUrls: payload.photoUrls || [],
              timestamp: clientTimestamp ? new Date(clientTimestamp) : new Date(),
              latitude: payload.latitude,
              longitude: payload.longitude
            },
            { upsert: true }
          );
        }
      } else if (eventType === 'LOCATION_UPDATE') {
        await DriverLocation.create({
          driver: req.user._id,
          trip: payload.tripId || null,
          vehicle: payload.vehicleId || null,
          latitude: payload.latitude,
          longitude: payload.longitude,
          recordedAt: clientTimestamp ? new Date(clientTimestamp) : new Date()
        });
      } else if (eventType === 'ISSUE_REPORTED') {
        const issueRef = `ISS-OFF-${Date.now().toString().slice(-6)}`;
        await Issue.create({
          issueRef,
          type: payload.type || 'OTHER',
          source: 'DRIVER',
          delivery: entityId,
          reportedBy: req.user._id,
          description: payload.description || 'Offline reported issue',
          severity: payload.severity || 'MEDIUM',
          status: 'OPEN'
        });
      }
    } catch (err) {
      status = 'FAILED';
      conflictReason = err.message;
    }

    // 3. Save OfflineEvent log
    const savedEvent = await OfflineEvent.create({
      clientEventId,
      deviceId: deviceId || 'UNKNOWN_DEVICE',
      user: req.user._id,
      eventType,
      entityType,
      entityId,
      payload,
      clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : new Date(),
      serverTimestamp: new Date(),
      status,
      conflictReason
    });

    if (status === 'CONFLICT') {
      socketService.emitSyncConflict(savedEvent);
      await auditService.log({
        user: req.user,
        action: 'OFFLINE_SYNC_CONFLICT',
        entityType,
        entityId,
        reason: conflictReason,
        newData: ev
      });
    }

    processedResults.push({
      clientEventId,
      status,
      conflictReason
    });
  }

  socketService.emitSyncCompleted({
    count: processedResults.length,
    timestamp: new Date()
  });

  res.status(200).json(
    new ApiResponse(200, { processed: processedResults }, 'Sync batch processed successfully')
  );
});

/**
 * Get offline sync status and summary
 * GET /api/v1/sync/status
 */
const getSyncStatus = asyncHandler(async (req, res) => {
  const [totalSynced, conflictsCount, pendingCount] = await Promise.all([
    OfflineEvent.countDocuments({ status: 'SYNCED' }),
    OfflineEvent.countDocuments({ status: 'CONFLICT' }),
    OfflineEvent.countDocuments({ status: 'PENDING' })
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      totalSynced,
      conflictsCount,
      pendingCount
    }, 'Sync status retrieved')
  );
});

/**
 * Retry failed sync events
 * POST /api/v1/sync/retry
 */
const retrySync = asyncHandler(async (req, res) => {
  const { clientEventIds } = req.body;
  const filter = { status: { $in: ['FAILED', 'CONFLICT'] } };
  if (clientEventIds && clientEventIds.length > 0) {
    filter.clientEventId = { $in: clientEventIds };
  }

  const events = await OfflineEvent.find(filter);
  let resolvedCount = 0;

  for (const ev of events) {
    ev.status = 'SYNCED';
    ev.conflictReason = null;
    await ev.save();
    resolvedCount++;
  }

  res.status(200).json(new ApiResponse(200, { resolvedCount }, 'Sync retry executed'));
});

/**
 * Get list of offline sync conflicts
 * GET /api/v1/sync/conflicts
 */
const getConflicts = asyncHandler(async (req, res) => {
  const conflicts = await OfflineEvent.find({ status: 'CONFLICT' })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, conflicts, `Retrieved ${conflicts.length} conflicts`));
});

/**
 * Resolve a sync conflict manually
 * POST /api/v1/sync/conflicts/:id/resolve
 */
const resolveConflict = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resolution = 'ACCEPTED_SERVER_STATE', notes } = req.body;

  const ev = await OfflineEvent.findById(id);
  if (!ev) {
    return res.status(404).json(new ApiResponse(404, null, 'Conflict event not found'));
  }

  ev.status = 'SYNCED';
  ev.conflictReason = `Resolved (${resolution}): ${notes || 'Manually reconciled'}`;
  await ev.save();

  res.status(200).json(new ApiResponse(200, ev, 'Conflict resolved'));
});

module.exports = {
  bootstrapOfflineData,
  processSyncEvents,
  getSyncStatus,
  retrySync,
  getConflicts,
  resolveConflict
};
