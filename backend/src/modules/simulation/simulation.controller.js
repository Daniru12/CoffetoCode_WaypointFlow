const timeUtil = require('../../utils/time.util');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const socketService = require('../../services/socket.service');

const getSimulationTime = asyncHandler(async (req, res) => {
  const status = timeUtil.getSimulationStatus();
  const cutoff = timeUtil.getTimeUntilCutoff();
  res.status(200).json(new ApiResponse(200, { ...status, cutoff }, 'Simulation time status retrieved'));
});

const setSimulationTime = asyncHandler(async (req, res) => {
  const { targetTime } = req.body;
  const newEffective = timeUtil.setSimulatedTime(targetTime);
  const status = timeUtil.getSimulationStatus();
  const cutoff = timeUtil.getTimeUntilCutoff();

  socketService.emit('simulation.time.updated', { ...status, cutoff });

  res.status(200).json(new ApiResponse(200, { ...status, cutoff }, `Operational time updated to ${status.effectiveColomboTime.timeString} Colombo Time`));
});

const resetSimulationTime = asyncHandler(async (req, res) => {
  timeUtil.resetSimulatedTime();
  const status = timeUtil.getSimulationStatus();
  const cutoff = timeUtil.getTimeUntilCutoff();

  socketService.emit('simulation.time.updated', { ...status, cutoff });

  res.status(200).json(new ApiResponse(200, { ...status, cutoff }, 'Operational time reset to live system clock'));
});

module.exports = {
  getSimulationTime,
  setSimulationTime,
  resetSimulationTime
};
