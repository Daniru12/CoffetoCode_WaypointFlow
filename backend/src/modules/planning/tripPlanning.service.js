/**
 * tripPlanning.service.js
 * Implements official Tech-Triathlon Challenge Booklet (p. 20-21) and check_allocation.py standards
 */

// District Travel Reference (from district_travel.csv)
const DISTRICT_TRAVEL = {
  Colombo: {
    depot: 'Peliyagoda',
    road_class: 'urban',
    free_flow_kmh: 30.0,
    depot_to_district_km: 12,
    depot_to_district_freeflow_min: 24,
    inter_stop_km: 4.0,
    inter_stop_freeflow_min: 8
  },
  Gampaha: {
    depot: 'Peliyagoda',
    road_class: 'suburban',
    free_flow_kmh: 45.0,
    depot_to_district_km: 28,
    depot_to_district_freeflow_min: 37,
    inter_stop_km: 7.0,
    inter_stop_freeflow_min: 9
  },
  Kalutara: {
    depot: 'Peliyagoda',
    road_class: 'suburban',
    free_flow_kmh: 45.0,
    depot_to_district_km: 48,
    depot_to_district_freeflow_min: 64,
    inter_stop_km: 9.0,
    inter_stop_freeflow_min: 12
  },
  Galle: {
    depot: 'Peliyagoda',
    road_class: 'highway',
    free_flow_kmh: 70.0,
    depot_to_district_km: 120,
    depot_to_district_freeflow_min: 103,
    inter_stop_km: 10.0,
    inter_stop_freeflow_min: 9
  },
  Matara: {
    depot: 'Peliyagoda',
    road_class: 'highway',
    free_flow_kmh: 70.0,
    depot_to_district_km: 160,
    depot_to_district_freeflow_min: 137,
    inter_stop_km: 12.0,
    inter_stop_freeflow_min: 10
  },
  Kurunegala: {
    depot: 'Peliyagoda',
    road_class: 'suburban',
    free_flow_kmh: 45.0,
    depot_to_district_km: 95,
    depot_to_district_freeflow_min: 127,
    inter_stop_km: 14.0,
    inter_stop_freeflow_min: 19
  },
  Puttalam: {
    depot: 'Peliyagoda',
    road_class: 'suburban',
    free_flow_kmh: 45.0,
    depot_to_district_km: 130,
    depot_to_district_freeflow_min: 173,
    inter_stop_km: 18.0,
    inter_stop_freeflow_min: 24
  },
  Kandy: {
    depot: 'Kandy',
    road_class: 'urban',
    free_flow_kmh: 30.0,
    depot_to_district_km: 8,
    depot_to_district_freeflow_min: 16,
    inter_stop_km: 3.0,
    inter_stop_freeflow_min: 6
  },
  Matale: {
    depot: 'Kandy',
    road_class: 'suburban',
    free_flow_kmh: 45.0,
    depot_to_district_km: 26,
    depot_to_district_freeflow_min: 35,
    inter_stop_km: 8.0,
    inter_stop_freeflow_min: 11
  },
  'Nuwara Eliya': {
    depot: 'Kandy',
    road_class: 'hill',
    free_flow_kmh: 42.0,
    depot_to_district_km: 78,
    depot_to_district_freeflow_min: 111,
    inter_stop_km: 14.0,
    inter_stop_freeflow_min: 20
  },
  Badulla: {
    depot: 'Kandy',
    road_class: 'hill',
    free_flow_kmh: 42.0,
    depot_to_district_km: 130,
    depot_to_district_freeflow_min: 186,
    inter_stop_km: 16.0,
    inter_stop_freeflow_min: 23
  },
  Kegalle: {
    depot: 'Kandy',
    road_class: 'suburban',
    free_flow_kmh: 45.0,
    depot_to_district_km: 40,
    depot_to_district_freeflow_min: 53,
    inter_stop_km: 10.0,
    inter_stop_freeflow_min: 13
  }
};

// Service Allowance Matrix (from service_allowance.csv)
const SERVICE_ALLOWANCE = {
  Fresh: {
    rear_dock: 15,
    street: 16,
    mall_bay: 18
  },
  Style: {
    rear_dock: 38,
    street: 46,
    mall_bay: 59
  },
  Tech: {
    rear_dock: 43,
    street: 55,
    mall_bay: 55
  }
};

const TRIP_BUDGET_PREDAWN = 270; // 03:30 AM to 08:00 AM for Fresh
const TRIP_BUDGET_DAYTIME = 480; // Trading day for Style & Tech
const MAX_TRIPS_PER_VEHICLE = 2;

class TripPlanningService {
  /**
   * Get travel reference for a given district
   */
  getDistrictTravel(district) {
    return DISTRICT_TRAVEL[district] || {
      depot: 'Peliyagoda',
      road_class: 'suburban',
      free_flow_kmh: 45.0,
      depot_to_district_km: 30,
      depot_to_district_freeflow_min: 35,
      inter_stop_km: 8.0,
      inter_stop_freeflow_min: 10
    };
  }

  /**
   * Get service allowance handling time for a brand and dock type
   */
  getHandlingAllowance(brand, dockType = 'rear_dock') {
    const brandMap = SERVICE_ALLOWANCE[brand] || SERVICE_ALLOWANCE.Fresh;
    const normalizedDock = String(dockType).toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (normalizedDock.includes('mall')) return brandMap.mall_bay;
    if (normalizedDock.includes('street') || normalizedDock.includes('curb')) return brandMap.street;
    return brandMap.rear_dock;
  }

  /**
   * Calculates official trip duration per check_allocation.py:
   * trip_minutes = depot_to_district_freeflow_min + (n-1)*inter_stop_freeflow_min + sum(service_allowance_min)
   */
  calculateTripTime(district, brand, stops = []) {
    const n = stops.length;
    if (n === 0) return 0;

    const d = this.getDistrictTravel(district);
    const outboundTravel = d.depot_to_district_freeflow_min;
    const interStopTravel = (n - 1) * d.inter_stop_freeflow_min;
    
    let totalHandling = 0;
    for (const stop of stops) {
      const dockType = stop.order?.outlet?.dockType || stop.order?.outlet?.dock_type || stop.outlet?.dockType || stop.dockType || stop.outlet?.dock_type || 'rear_dock';
      totalHandling += this.getHandlingAllowance(brand, dockType);
    }

    return {
      outboundTravel,
      interStopTravel,
      totalHandling,
      totalMinutes: outboundTravel + interStopTravel + totalHandling,
      estimatedDistanceKm: d.depot_to_district_km + (n - 1) * d.inter_stop_km
    };
  }

  /**
   * Calculate sequenced arrival times for each stop on a trip
   */
  sequenceStopArrivals(plannedDeparture, district, brand, stops = []) {
    const d = this.getDistrictTravel(district);
    const depTime = new Date(plannedDeparture);
    let currentClock = new Date(depTime.getTime() + d.depot_to_district_freeflow_min * 60000);

    return stops.map((stop, idx) => {
      const dockType = stop.order?.outlet?.dockType || stop.order?.outlet?.dock_type || stop.outlet?.dockType || stop.dockType || stop.outlet?.dock_type || 'rear_dock';
      const handlingMin = this.getHandlingAllowance(brand, dockType);

      if (idx > 0) {
        currentClock = new Date(currentClock.getTime() + d.inter_stop_freeflow_min * 60000);
      }

      const arrivalTime = new Date(currentClock.getTime());
      // After unloading, departure from this stop:
      currentClock = new Date(currentClock.getTime() + handlingMin * 60000);

      return {
        ...stop,
        stopSequence: idx + 1,
        dockType,
        handlingMin,
        estimatedArrival: arrivalTime,
        departureAfterUnload: new Date(currentClock.getTime())
      };
    });
  }

  /**
   * Validate cumulative daily budgets per vehicle
   */
  validateVehicleBudget(vehicle, tripsForDay = []) {
    if (tripsForDay.length > MAX_TRIPS_PER_VEHICLE) {
      return {
        valid: false,
        code: 'MAX_TRIPS_EXCEEDED',
        message: `Vehicle ${vehicle.vehicleId} exceeds maximum allowed ${MAX_TRIPS_PER_VEHICLE} trips per day.`
      };
    }

    let freshMinutes = 0;
    let daytimeMinutes = 0;

    for (const t of tripsForDay) {
      const district = t.district || t.orders?.[0]?.order?.outlet?.district || 'Colombo';
      const brand = t.brand || 'Fresh';
      const stops = t.orders || [];
      const calc = this.calculateTripTime(district, brand, stops);

      if (brand === 'Fresh') {
        freshMinutes += calc.totalMinutes;
      } else {
        daytimeMinutes += calc.totalMinutes;
      }
    }

    if (freshMinutes > TRIP_BUDGET_PREDAWN) {
      return {
        valid: false,
        code: 'FRESH_PREDAWN_BUDGET_EXCEEDED',
        message: `Vehicle ${vehicle.vehicleId} Fresh trips total ${freshMinutes} min, exceeding 270m pre-dawn budget (03:30-08:00 AM).`
      };
    }

    if (daytimeMinutes > TRIP_BUDGET_DAYTIME) {
      return {
        valid: false,
        code: 'DAYTIME_BUDGET_EXCEEDED',
        message: `Vehicle ${vehicle.vehicleId} Daytime trips total ${daytimeMinutes} min, exceeding 480m operating budget.`
      };
    }

    return {
      valid: true,
      freshMinutes,
      daytimeMinutes,
      freshBudgetRemaining: TRIP_BUDGET_PREDAWN - freshMinutes,
      daytimeBudgetRemaining: TRIP_BUDGET_DAYTIME - daytimeMinutes
    };
  }
}

module.exports = new TripPlanningService();
