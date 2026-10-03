const Notification = require('./notification.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const filter = {
    $or: [{ user: req.user._id }, { user: null }]
  };

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json(new ApiResponse(200, notifications, `Retrieved ${notifications.length} notifications`));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
  res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
});

module.exports = {
  getNotifications,
  markAsRead
};
