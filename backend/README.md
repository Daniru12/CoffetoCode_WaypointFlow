# WaypointFlow — Backend Implementation

Backend service for **CoffetoCode WaypointFlow**: an intelligent delivery management and operational orchestration platform following the Designathon workflow: **Store Manager → Dispatcher → Loader → Driver → Store Manager**.

## 1. Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + bcryptjs
- **Validation**: Zod
- **Realtime**: Socket.IO
- **File Uploads**: Multer
- **File Storage**: Supabase Storage
- **Testing**: Jest + Supertest
- **Deployment**: Docker & Docker Compose

---

## 2. Architecture & Designathon Workflow
```
Store Manager (Creates Orders, Confirms Receipts, Reports Discrepancies)
     │
     ▼
Dispatcher (Order Queue, 10-Constraint Allocation Engine, Plan Publishing)
     │
     ▼
Loader (Warehouse Jobs, Shortfall/Damage Reporting, Ready for Departure)
     │
     ▼
Driver (Route Execution, GPS Location, Offline Sync, Proof of Delivery)
     │
     ▼
Store Manager (Receipt Verification & SLA Settlement)
```

---

## 3. Constraint Validation Engine
Sequential execution order ensuring explainable planning decisions:
1. **Vehicle Availability**: Status `AVAILABLE` / not undergoing workshop repair
2. **Depot Compatibility**: Vehicle depot matches order outlet depot
3. **Temperature Compatibility**: Chilled orders strictly require reefer vehicles
4. **Physical Access**: `van_only` parking constraint enforces van type vehicle
5. **Brand + District Partitioning**: Ensures brand compatibility and regional routing
6. **Weight Capacity**: Cumulative order weight <= vehicle weight capacity (kg)
7. **Volume Capacity**: Cumulative order volume <= vehicle volume capacity (m³)
8. **Shift Trip Limit**: Maximum 2 trips per vehicle per daily shift
9. **Delivery Window**: Enforces store opening windows (e.g. morning mall dock 06:00-08:00)
10. **Weekly Fuel Quota**: Prevents exceeding vehicle's weekly fuel allocation

---

## 4. API Reference (`/api/v1`)

### Authentication
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`
- `POST /api/v1/auth/refresh`

### Store Manager
- `GET    /api/v1/store/dashboard`
- `POST   /api/v1/orders`
- `GET    /api/v1/orders/my`
- `GET    /api/v1/orders/:orderId`
- `PATCH  /api/v1/orders/:orderId`
- `DELETE /api/v1/orders/:orderId`
- `GET    /api/v1/orders/:orderId/tracking`
- `GET    /api/v1/deliveries/:deliveryId`
- `POST   /api/v1/deliveries/:deliveryId/receipt`
- `POST   /api/v1/deliveries/:deliveryId/issues`

### Dispatcher
- `GET  /api/v1/dispatcher/dashboard`
- `GET  /api/v1/dispatcher/alerts`
- `GET  /api/v1/dispatcher/critical-incidents`
- `GET  /api/v1/orders/queue`

### Planning & Allocation
- `POST   /api/v1/plans`
- `GET    /api/v1/plans`
- `GET    /api/v1/plans/:planId`
- `POST   /api/v1/plans/:planId/validate`
- `POST   /api/v1/plans/:planId/publish`
- `GET    /api/v1/plans/:planId/unallocated-orders`
- `GET    /api/v1/allocation/orders/:orderId/compatible-vehicles`
- `POST   /api/v1/allocation/validate`
- `POST   /api/v1/allocation/assign`
- `PATCH  /api/v1/allocation/:assignmentId`
- `DELETE /api/v1/allocation/:assignmentId`

### Deferrals
- `GET  /api/v1/deferrals`
- `GET  /api/v1/deferrals/:id`
- `POST /api/v1/orders/:orderId/defer`
- `POST /api/v1/deferrals/:id/reconsider`
- `POST /api/v1/deferrals/:id/resolve`

### Warehouse Loading
- `GET   /api/v1/loading/jobs/today`
- `GET   /api/v1/loading/jobs/:jobId`
- `POST  /api/v1/loading/jobs/:jobId/start`
- `PATCH /api/v1/loading/jobs/:jobId/items/:itemId`
- `POST  /api/v1/loading/jobs/:jobId/shortfall`
- `POST  /api/v1/loading/jobs/:jobId/damage`
- `POST  /api/v1/loading/jobs/:jobId/complete`
- `POST  /api/v1/loading/jobs/:jobId/ready-for-departure`

### Driver & Deliveries
- `GET  /api/v1/driver/routes/today`
- `GET  /api/v1/driver/trips/:tripId`
- `GET  /api/v1/driver/trips/:tripId/stops`
- `POST /api/v1/deliveries/:deliveryId/arrive`
- `POST /api/v1/deliveries/:deliveryId/complete`
- `POST /api/v1/deliveries/:deliveryId/fail`
- `POST /api/v1/deliveries/:deliveryId/pod`
- `POST /api/v1/driver/location`
- `POST /api/v1/driver/vehicle-issue`

### Offline Sync
- `GET  /api/v1/sync/bootstrap`
- `POST /api/v1/sync/events`
- `GET  /api/v1/sync/status`
- `POST /api/v1/sync/retry`
- `GET  /api/v1/sync/conflicts`
- `POST /api/v1/sync/conflicts/:id/resolve`

### Fleet Breakdown & Trip Recovery
- `POST /api/v1/trips/:tripId/reassign-vehicle`
- `POST /api/v1/trips/:tripId/defer-remaining-orders`

### Tracking & Forecasts
- `GET  /api/v1/tracking/live`
- `GET  /api/v1/tracking/trips/:tripId`
- `POST /api/v1/tracking/location`
- `GET  /api/v1/forecasts/capacity`
- `GET  /api/v1/forecasts/capacity/:week`
- `GET  /api/v1/forecasts/demand`
- `POST /api/v1/forecasts/import`

---

## 5. Running & Testing

### Development
```bash
cd backend
npm install
npm run dev
```

### Seeding Master Data
```bash
npm run seed
```
Default accounts seeded with password `Waypoint2026!`:
- `dispatcher@waypoint.lk`
- `loader@waypoint.lk`
- `driver@waypoint.lk`
- `store.manager@waypoint.lk`

### Run Automated Tests
```bash
npm test
```

### Docker
```bash
docker compose up --build
```
