const { getIO } = require('../config/socket');

class SocketService {
  emit(event, data, room = null) {
    const io = getIO();
    if (!io) return;

    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
  }

  // Explicit helper methods for core Designathon events
  emitOrderCreated(order) {
    this.emit('order.created', order);
  }

  emitPlanPublished(plan) {
    this.emit('plan.published', plan);
  }

  emitLoadingStarted(job) {
    this.emit('loading.started', job);
  }

  emitLoadingShortfall(data) {
    this.emit('loading.shortfall', data);
  }

  emitLoadingCompleted(job) {
    this.emit('loading.completed', job);
  }

  emitTripStarted(trip) {
    this.emit('trip.started', trip);
  }

  emitDriverLocation(location) {
    this.emit('driver.location', location);
  }

  emitDeliveryArrived(delivery) {
    this.emit('delivery.arrived', delivery);
  }

  emitDeliveryCompleted(delivery) {
    this.emit('delivery.completed', delivery);
  }

  emitDeliveryFailed(delivery) {
    this.emit('delivery.failed', delivery);
  }

  emitVehicleBreakdown(incident) {
    this.emit('vehicle.breakdown', incident);
  }

  emitOrderDeferred(deferral) {
    this.emit('order.deferred', deferral);
  }

  emitRouteUpdated(trip) {
    this.emit('route.updated', trip);
  }

  emitSyncCompleted(result) {
    this.emit('sync.completed', result);
  }

  emitSyncConflict(conflict) {
    this.emit('sync.conflict', conflict);
  }
}

module.exports = new SocketService();
