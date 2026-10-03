export const ORDER_STATUSES = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PLANNING: 'Planning',
  SCHEDULED: 'Scheduled',
  LOADING: 'Loading',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  DEFERRED: 'Deferred',
  ISSUE_REPORTED: 'Issue Reported',
  CLOSED: 'Closed'
};

export const TRIP_STATUSES = {
  PLANNED: 'Planned',
  READY_FOR_LOADING: 'Ready for Loading',
  LOADING: 'Loading',
  READY: 'Ready for Departure',
  IN_TRANSIT: 'In Transit',
  COMPLETED: 'Completed',
  INTERRUPTED: 'Interrupted'
};

export const getStatusLabel = (status) => {
  return ORDER_STATUSES[status] || TRIP_STATUSES[status] || status;
};
