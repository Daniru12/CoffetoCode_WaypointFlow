# WaypointFlow: Complete End-to-End System Proof-Testing Guide

This technical guide provides the exact step-by-step procedure to proof-test the complete multi-role Waypoint Delivery Intelligence System before committing and pushing code.

---

## 1. System Credentials & Role Workspaces

| Role                           | Username / Email             | Password       | Primary Workspace Route | Purpose                                                                                        |
| :----------------------------- | :--------------------------- | :------------- | :---------------------- | :--------------------------------------------------------------------------------------------- |
| **Store Manager**              | `ishani@waypoint.lk`         | `12345678`     | `/store/dashboard`      | Inventory, stock shortage requests, replenishment plans, outlet order creation                 |
| **Warehouse Manager / Loader** | `loader@waypoint.lk`         | `12345678`     | `/loader/jobs`          | Stock request approval & dispatch, vehicle packing checklists (LIFO), dock stock transfer      |
| **Central Dispatcher**         | `luqmandispatcher@gmail.com` | `12345678`     | `/dispatcher/planning`  | Auto-plan template engine, 7 constraints solver, 1-click approval, dynamic auto-reassign       |
| **Driver**                     | `luqmandriver@gmail.com`     | `12345678`     | `/driver/route`         | In-cab GPS cockpit, turn-by-turn navigation (Google Maps / Waze), digital POD, incident report |
| **System Administrator**       | `admin@waypoint.lk`          | `Waypoint2026` | `/admin/users`          | Fleet management, depot hubs, driver CDL compliance, governance audit log                      |

---

## 2. Complete End-to-End Operational Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor SM as Store Manager
    actor LM as Warehouse Loader
    actor DP as Central Dispatcher
    actor DR as Driver
    actor DR2 as Replacement Driver

    Note over SM,LM: Phase 1: Stock Shortage & Replenishment
    SM->>LM: 1. Requests missing goods (POST /inventory/stock-request)
    LM->>LM: 2. Approves request in /loader/inventory
    LM->>SM: 3. Dispatches goods (Deducts Main Warehouse stock)
    SM->>SM: 4. Confirms receipt in /store/inventory (Upserts StoreManagerInventory)
    SM->>DP: 5. Submits confirmed retail orders (/store/orders/create)

    Note over DP,LM: Phase 2: Delivery Intelligence Auto-Plan
    DP->>DP: 6. Clicks "Auto-Generate Plan" in /dispatcher/planning
    Note right of DP: Solves 7 Constraints (Reefer, Weight, Volume, Van, Fuel, Time, Windows)<br/>Calculates Stop ETAs (+25m depot, +35m stop)<br/>Generates Reverse LIFO Dock Manifest
    DP->>DP: 7. 1-Click "Approve All Trips" (VALID status)
    DP->>LM: 8. Clicks "Publish Plan & Release to Dock"
    Note over LM,DR: Phase 3: Warehouse Loading Bay Signoff
    LM->>LM: 9. Opens /loader/jobs & packing checklist (/loader/manifest/:id)
    LM->>LM: 10. Packs cargo in strict reverse LIFO sequence (Stop N first, Stop 1 at doors)
    LM->>DR: 11. Marks job ready for departure

    Note over DR,SM: Phase 4: Driver In-Cab Execution & POD
    DR->>DR: 12. Opens /driver/route & cockpit (/driver/trips/:id/stops)
    DR->>DR: 13. Navigates via embedded Leaflet map / Google Maps / Waze
    DR->>SM: 14. Completes Stop 1 with digital POD customer signature (/driver/deliveries/:id/pod)

    Note over DR,DR2: Phase 5: Incident & Dynamic Auto-Reassignment
    DR->>DP: 15. Vehicle breaks down; reports in /driver/issue with "Cannot Continue"
    Note right of DP: Trip flagged INTERRUPTED & atRisk=true<br/>Remaining stops marked AT_RISK<br/>Solver finds optimal backup unit & driver<br/>Calculates new ETAs (+30m response buffer)<br/>Generates Stock Transfer Note
    DP->>DP: 16. Reviews "Auto-Reassign Template Panel" in /dispatcher/planning
    DP->>DR2: 17. 1-Click "Approve Reassignment"
    DP->>LM: 18. Emits emergency stock transfer instructions to Dock
    LM->>LM: 19. Sees "Emergency Stock Transfer" banner in /loader/jobs & transfers cargo
    DR2->>SM: 20. Replacement driver receives updated route; completes remaining stops
```

---

## 3. Step-by-Step Proof-Testing Script

### Phase 1: Store Manager Stock Shortage & Replenishment
1. **Login as Store Manager**:
   - URL: `http://localhost:5173/login`
   - Email: `ishani@waypoint.lk` | Password: `12345678`
2. **Inspect Personal Inventory**:
   - Navigate to **"My Inventory"** (`/store/inventory`).
   - Notice the two tabs: **"My Inventory"** (`StoreManagerInventory`) and **"Incoming Stock"**.
3. **Trigger Stock Shortage Request**:
   - Navigate to **"Create Order"** (`/store/orders/create`) or **"Replenishment Plans"** (`/store/replenishment-plans/create`).
   - If an item's required quantity exceeds your available store stock, the form automatically calculates the shortage.
   - Click **"Request Stock Shortage"** (`POST /api/v1/inventory/stock-request`).
   - Request is recorded with status `REQUESTED`.
4. **Login as Warehouse Loader & Dispatch Goods**:
   - Logout and login as `loader@waypoint.lk` | Password: `12345678`.
   - Navigate to **"Inventory Management"** (`/loader/inventory`).
   - Switch to the **"Store Manager Stock Requests"** tab.
   - Locate the pending request (`REQUESTED`), click **"Approve"** (`APPROVED`).
   - Click **"Mark as Sent (Deduct Main Stock)"** (`SENT`).
   - Verify: Master warehouse quantity (`InventoryItem`) is deducted immediately.
5. **Confirm Receipt as Store Manager**:
   - Logout and login back as `ishani@waypoint.lk`.
   - Go to `/store/inventory` ➔ **"Incoming Stock"** tab.
   - You will see the `SENT` stock request with an active green button: **"Confirm Received"**.
   - Click **"Confirm Received"** (`PUT /api/v1/inventory/stock-requests/:id/receive`).
   - Verify: Item quantity is immediately upserted into **"My Inventory"** tab.
6. **Create Orders via Plan-Based Generation OR Manual Ad-Hoc**:
   - **Method A: Plan-Based Order Generation (Bulk Outlet Dispatch)**:
     - Navigate to **"Replenishment Plans"** (`/store/replenishment-plans`).
     - On any active plan card, click **"⚡ Generate Orders"**.
     - Choose target delivery date (defaults to tomorrow's operating run).
     - Notice the live **16:00 Colombo Cutoff** indicator.
     - Click **"⚡ Generate & Queue for Dispatch"** (`POST /api/v1/store/replenishment-plans/:id/generate-orders`).
     - Verify: Confirmed orders are created for all assigned outlets in the plan, items are deducted from store inventory, and orders are queued in the Central Dispatcher Orders Queue.
   - **Method B: Manual Ad-Hoc Outlet Order**:
     - Navigate to **"Create Order"** (`/store/orders/create`) ➔ **"1. Create Retail Dispatch Order"** tab.
     - Select target retail outlet (e.g. `Kandy City Center - Keells Super`). Brand and dock requirements populate automatically.
     - *(Optional)* Choose a plan from **"Quick-Fill from Plan"** to auto-populate item quantities in 1 click.
     - Adjust quantities within your available store inventory. Live payload (units, kg, m³) updates dynamically.
     - Review the **16:00 Colombo Cutoff Banner** (before 16:00 = Current Cycle; after 16:00 = Next Cycle).
     - Click **"Confirm & Dispatch Retail Order"** (`POST /api/v1/orders`).
     - Order is confirmed and transmitted to the Central Dispatcher queue.
7. **Simulate 16:00 Colombo Cutoff Scenarios**:
   - In the Topbar, click the **Colombo Clock** widget (`[SIM]` / Live).
   - Click **"🌙 16:30 (Post)"** to test post-cutoff rollover.
   - Place an order for tomorrow. Notice the badge updates to **"⏰ Post-Cutoff (Next Cycle)"** and the order is reserved for the subsequent operating run.
   - Click **"☀️ 14:00 (Pre)"** to return to pre-cutoff mode.

---

### Phase 2: Central Dispatcher Auto-Plan Generation
1. **Login as Central Dispatcher**:
   - URL: `http://localhost:5173/login`
   - Email: `luqmandispatcher@gmail.com` | Password: `12345678`
2. **Review Incoming Orders**:
   - Navigate to **"Orders Queue"** (`/dispatcher/orders`).
   - Verify all confirmed retail orders are listed with depot, district, brand, temperature requirement, weight, and volume.
3. **Execute Auto-Plan Solver**:
   - Navigate to **"Delivery Planning"** (`/dispatcher/planning`).
   - In Stage 1 ("Select Operating Plan"), click the prominent button:
     **"✨ Auto-Generate Plan (Delivery Intelligence)"**
   - The solver executes automatically:
     - Groups orders by Depot (`Peliyagoda DC` vs `Kandy Hub`), District, Brand (`Fresh`, `Style`, `Tech`), and Temperature (`Ambient` vs `Chilled`).
     - Validates **7 Hard Feasibility Constraints**:
       1. Reefer constraint (chilled cargo only assigned to reefer vehicles).
       2. Weight payload capacity (`orderWeightKg <= vehicle.weightCapKg`).
       3. Volume payload capacity (`orderVolumeM3 <= vehicle.volumeCapM3`).
       4. Outlet dock constraint (`van_only` parking requires van vehicle type).
       5. Vehicle weekly fuel quota.
       6. Driver daily time budget (max 2 runs/day).
       7. Departure delivery windows:
          - Pre-dawn Fresh deliveries scheduled at **04:30 AM** (270-minute window).
          - Standard daytime runs scheduled at **08:30 AM** (480-minute window).
     - Calculates arrival ETAs (+25m initial transit from depot, +35m per stop).
     - Synthesizes the **Reverse LIFO Dock Loading List** (innermost Stop N = Position 1, door Stop 1 = Position N).
     - Auto-defers excess low-priority orders if capacity is exceeded (consecutively skipped orders receive highest priority; deferrals logged to `/dispatcher/deferrals`).
4. **Review & Batch Approval**:
   - In Stage 2 ("Review Formed Runs"), inspect the trip cards:
     - Note the **"✨ Auto-assigned"** badge.
     - Note the green **"VALID"** status badge.
     - Read the **"Explainable Solver Rationale"** card on each trip.
     - Click **"View Reverse LIFO Dock Loading Sequence"** to verify the inverted loading order.
   - Click **"Approve All Trips (1-Click)"** (`POST /api/v1/plans/:id/approve-all`).
   - Click **"Publish Plan & Release to Dock"** in Stage 3.
   - Trips are published and pushed automatically to the Loader and Driver portals.

---

### Phase 3: Warehouse Loader Vehicle Packing (LIFO)
1. **Login as Warehouse Loader**:
   - Email: `loader@waypoint.lk` | Password: `12345678`
2. **Inspect Loading Queue**:
   - Navigate to `/loader/jobs` (also accessible via `/loader/trips` and `/loader/manifest`).
   - The newly published trip appears with assigned vehicle, driver, and consignment count.
3. **Execute Reverse LIFO Packing Checklist**:
   - Click **"Start Loading"** or **"Open Checklist"** (`/loader/jobs/:jobId`).
   - Note the **"LIFO Loading Principle Active"** indicator:
     - The items are sequenced in reverse delivery order.
     - The final customer stop is loaded innermost in the truck body.
     - Stop 1 (first destination) is loaded nearest the rear cargo doors.
   - Toggle each item as `LOADED`.
   - Click **"Mark Ready for Departure"** (`READY_FOR_DEPARTURE`).

---

### Phase 4: Driver In-Cab Navigation & Digital POD
1. **Login as Driver**:
   - Email: `luqmandriver@gmail.com` | Password: `12345678`
2. **Review Assigned Run**:
   - Go to **"Today Route"** (`/driver/route`).
   - Notice the assigned trip card with scheduled departure, route sequence, and total stops.
   - Click **"Preview Route Map"** to preview the full route circuit on Leaflet.
   - Click **"Start Run / Open In-Cab Cockpit"** (`/driver/trips/:tripId/stops`).
3. **In-Cab Execution Cockpit**:
   - **Cockpit View**: Displays live distance and driving ETA (Haversine formula from driver GPS to destination).
   - **Turn-by-Turn Navigation**: 1-tap **Google Maps** or **Waze** launcher.
   - **Interactive Map**: Sequenced stop pins (#1, #2, #3), active pulsing halo, and depot pin.
   - Click **"Begin Delivery & Customer Signoff"** (`/driver/deliveries/:deliveryId/pod`).
4. **Digital Proof of Delivery (POD)**:
   - Enter recipient name.
   - Sign digitally on the HTML5 touch canvas.
   - Click **"Confirm Delivery & Complete Stop"**.
   - Stop is marked `DELIVERED`, and map pin updates with a green checkmark (`✓`).

---

### Phase 5: Emergency Vehicle Breakdown & Dynamic Auto-Reassignment
1. **Trigger Incident as Driver**:
   - While on route, go to `/driver/issue` (or `/driver/deliveries/:deliveryId/incident`).
   - Select Issue Type: `VEHICLE_BREAKDOWN` (or `ACCIDENT`, `REEFER_FAILURE`).
   - Set Severity: `CRITICAL`.
   - Check the toggle: **"⚠️ Cannot Continue - Request Emergency Vehicle Reassignment"**.
   - Enter description: *"Transmission failure on A1 highway near Kadugannawa."*
   - Click **"Submit Incident Report"**.
   - Backend automatically:
     - Sets trip status to `INTERRUPTED` and `atRisk = true`.
     - Flags all remaining uncompleted stops as `AT_RISK` (`isAtRisk = true`).
     - Searches fleet registry for optimal replacement vehicle (same depot, temperature type, sufficient payload capacity, van constraint, maximum fuel quota).
     - Recalculates remaining stop ETAs (+30 min swap response buffer + 25 min per stop).
     - Generates **Stock Transfer Note**.
2. **Dispatcher 1-Click Reassignment Approval**:
   - Switch back to Central Dispatcher (`luqmandispatcher@gmail.com`) at `/dispatcher/planning`.
   - The top banner alerts: **"⚠️ Critical Trip At-Risk Alert - Dynamic Reassignment Proposal"**.
   - Shows:
     - Disabled vehicle & breakdown reason.
     - Number of remaining retail stops at risk.
     - Recommended replacement unit and available driver.
     - Stock transfer note with cargo weight and volume.
   - Click **"Approve Reassignment (1-Click)"** (`POST /api/v1/trips/:tripId/approve-reassignment`).
   - System updates:
     - Retires broken-down vehicle to `UNAVAILABLE`.
     - Marks replacement vehicle `ASSIGNED`.
     - Resets remaining stops from `AT_RISK` to `PENDING` with new driver and recalculated ETAs.
     - **Keeps already completed stops intact**.
     - Updates `LoadingJob` with `isStockTransfer: true` and transfer note.
3. **Warehouse Loader Emergency Dock Notification**:
   - Switch to Warehouse Loader (`loader@waypoint.lk`) at `/loader/jobs`.
   - The loading job card prominently displays:
     **"🔄 Emergency Stock Transfer"** with the dock transfer note.
   - Inside `/loader/jobs/:jobId`, the yellow warning strip instructs loaders to verify cargo transfer from the disabled vehicle to the backup vehicle before departure signoff.
4. **Replacement Driver Route Hand-off**:
   - The replacement driver's `/driver/route` console receives the route update automatically.
   - The new driver completes the remaining deliveries without delay.

---

### Phase 6: System Governance & Fleet Management
1. **Login as Administrator**:
   - URL: `http://localhost:5173/login`
   - Email: `admin@waypoint.lk` | Password: `Waypoint2026`
2. **Fleet Registry & CDL Compliance**:
   - Navigate to **"Depots & Fleet Hub"** (`/admin/depots`).
   - Inspect vehicles, temperature ratings (`ambient` vs `reefer`), vehicle types (`truck`, `van`), payload capacities, and weekly fuel quotas.
   - Navigate to **"Personnel & Roles"** (`/admin/users`).
   - Inspect driver CDL license numbers, categories, expiry status (`VALID`, `EXPIRING_SOON`, `EXPIRED`), and emergency contact details.
3. **Audit Trail**:
   - Navigate to **"Governance & Audit"** (`/admin/audit`).
   - Inspect immutable audit records:
     - `PLAN_PUBLISHED`
     - `ROUTE_REASSIGNED` (with logged override reasons)
     - `RECEIPT_CONFIRMED`
     - `ISSUE_REPORTED`

---

## 4. Pre-Push Validation Checklist

Run the following checks before pushing code to `main`:

```bash
# 1. Backend Syntax & Initialization Test
cd backend
node -e "require('./src/app')"

# 2. Schema, Invariant & LIFO Reversal Test
node src/scripts/test_auto_assign_flow.js

# 3. Frontend Production Build Check
cd ../frontend
npm run build
```

**Expected Invariants**:
- [x] Zero build errors or unhandled bundle warnings.
- [x] LIFO loading list is the exact reverse of delivery stop sequence (Stop N innermost = Position 1; Stop 1 doors = Position N).
- [x] Pre-dawn Fresh deliveries depart at `04:30 AM` (270 min window); standard daytime runs depart at `08:30 AM` (480 min window).
- [x] Reefer orders never placed on ambient vehicles.
- [x] Breakdowns retain already delivered stops while resetting remaining stops to replacement vehicle.
- [x] Stock requests strictly segregate master depot inventory from Store Manager personal inventory.
