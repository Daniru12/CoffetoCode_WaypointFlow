const CapacityForecast = require('./capacityForecast.model');
const Order = require('../orders/order.model');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Get capacity forecasts with filters
 * GET /api/v1/forecasts/capacity
 */
const getCapacityForecasts = asyncHandler(async (req, res) => {
  const { depot, brand } = req.query;
  const filter = {};
  if (depot) filter.depot = depot;
  if (brand) filter.brand = brand;

  const forecasts = await CapacityForecast.find(filter).sort({ week: 1, depot: 1 });
  res.status(200).json(new ApiResponse(200, forecasts, `Retrieved ${forecasts.length} capacity forecasts`));
});

/**
 * Get capacity forecast for a specific week
 * GET /api/v1/forecasts/capacity/:week
 */
const getCapacityByWeek = asyncHandler(async (req, res) => {
  const { week } = req.params;
  const { depot } = req.query;

  const filter = { week };
  if (depot) filter.depot = depot;

  const forecasts = await CapacityForecast.find(filter);
  res.status(200).json(new ApiResponse(200, forecasts, `Capacity forecasts for week ${week}`));
});

/**
 * Get aggregated demand forecast based on current orders or forecast models
 * GET /api/v1/forecasts/demand
 */
const getDemandForecast = asyncHandler(async (req, res) => {
  const demandSummary = await Order.aggregate([
    {
      $group: {
        _id: { brand: '$brand', temp: '$tempRequirement' },
        totalOrders: { $sum: 1 },
        totalWeightKg: { $sum: '$orderWeightKg' },
        totalVolumeM3: { $sum: '$orderVolumeM3' },
        totalUnits: { $sum: '$orderUnits' }
      }
    }
  ]);

  res.status(200).json(new ApiResponse(200, demandSummary, 'Aggregated demand summary'));
});

/**
 * Import capacity forecasts
 * POST /api/v1/forecasts/import
 */
const importForecasts = asyncHandler(async (req, res) => {
  const { forecasts = [] } = req.body;

  if (!Array.isArray(forecasts) || forecasts.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'Array of forecast items required'));
  }

  const results = [];
  for (const item of forecasts) {
    const doc = await CapacityForecast.findOneAndUpdate(
      { week: item.week, depot: item.depot, brand: item.brand },
      item,
      { upsert: true, new: true }
    );
    results.push(doc);
  }

  res.status(201).json(new ApiResponse(201, results, `Imported ${results.length} forecast records`));
});

module.exports = {
  getCapacityForecasts,
  getCapacityByWeek,
  getDemandForecast,
  importForecasts
};
