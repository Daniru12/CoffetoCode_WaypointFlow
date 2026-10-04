# Stock Transfer and Replenishment Flow

This document outlines the architecture, API endpoints, and logic flow for the stock transfer and replenishment system between the Warehouse Manager and the Store Manager in the WaypointFlow system.

## 1. System Overview
The inventory ecosystem is strictly segregated to ensure accountability and accurate stock tracking:
- **Main Warehouse Inventory (`InventoryItem`)**: Represents the master stock available at the depot.
- **Store Manager Inventory (`StoreManagerInventory`)**: Represents stock that has been formally requested by, dispatched to, and received by a specific Store Manager.

Store Managers must request goods from the Main Warehouse. Only after receiving these goods can they allocate them to specific outlets through a **Replenishment Plan**.

---

## 2. Status Flow Lifecycle
A `StockRequest` follows a strict state machine to prevent negative inventory and duplicate stock transfers:
`REQUESTED` ➔ `APPROVED` ➔ `SENT` ➔ `RECEIVED` (Alternative: `REJECTED`)

---

## 3. Step-by-Step Flow & APIs

### Step 1: Store Manager Requests Stock
When a Store Manager lacks sufficient stock to fulfill a Replenishment Plan, they submit a stock shortage request.
* **API:** `POST /api/v1/inventory/stock-request`
* **Action:** Creates a new `StockRequest` record.
* **Status:** `REQUESTED`
* **Inventory Impact:** None at this stage.

### Step 2: Warehouse Manager Approves Request
The Warehouse Manager reviews the incoming `REQUESTED` stock requests via the Warehouse Dashboard.
* **API (View):** `GET /api/v1/inventory/stock-requests`
* **API (Approve):** `PUT /api/v1/inventory/stock-requests/:requestId/approve`
* **API (Reject):** `PUT /api/v1/inventory/stock-requests/:requestId/reject`
* **Status:** `APPROVED` (or `REJECTED`)
* **Inventory Impact:** None. Approval simply authorizes the future dispatch of goods.

### Step 3: Warehouse Manager Dispatches Goods (Marks as Sent)
Once the goods physically leave the warehouse, the Warehouse Manager marks the request as dispatched.
* **API:** `PUT /api/v1/inventory/stock-requests/:requestId/send`
* **Status:** `SENT`
* **Validation:** The system checks `InventoryItem` to ensure sufficient Main Warehouse stock exists. 
* **Inventory Impact:** 
  * The requested quantities are **deducted** from `InventoryItem` (Main Warehouse).
  * The Store Manager's inventory is **not** increased yet, reflecting that the goods are in transit.

### Step 4: Store Manager Confirms Receipt
The Store Manager sees the `SENT` stock in their **Incoming Stock** tab. Upon physical delivery, they confirm receipt.
* **API:** `PUT /api/v1/inventory/stock-requests/:requestId/receive`
* **Status:** `RECEIVED`
* **Inventory Impact:** 
  * The system performs an `upsert` on the `StoreManagerInventory` collection.
  * If the Store Manager already owns the item, the quantity is increased.
  * If it's a new item for them, a new stock record is created.

### Step 5: Store Manager Allocates Stock via Replenishment Plan
The Store Manager uses their newly acquired stock to build Weekly/Monthly Replenishment Plans for their assigned outlets.
* **Data Source:** The Plan Creation form exclusively fetches from `StoreManagerInventory`. It no longer accesses the Main Warehouse catalog.
* **API (Create):** `POST /api/v1/store/replenishment-plans`
* **API (Update):** `PUT /api/v1/store/replenishment-plans/:id`
* **Validation:** If the Store Manager saves the plan as `ACTIVE`, the backend calculates `Item Quantity × Number of Outlets` and verifies the Store Manager has sufficient personal stock.
* **Inventory Impact:** 
  * If the plan is saved as `DRAFT`, no stock is deducted.
  * If the plan is saved as `ACTIVE`, the required quantities are instantly **deducted** from the `StoreManagerInventory`.

---

## 4. Key Database Models

1. **`InventoryItem` (Main Warehouse)**
   - `itemCode`, `itemName`, `quantity`, `category`, `unit`
2. **`StoreManagerInventory`**
   - `storeManager` (ObjectId Ref), `itemCode`, `itemName`, `quantity`
   - *Note: Uses a compound unique index on `{ storeManager, itemCode }` to ensure one record per item per store manager.*
3. **`StockRequest`**
   - `storeManager` (ObjectId Ref), `items` (Array of shortages), `status` (Enum: `REQUESTED`, `APPROVED`, `REJECTED`, `SENT`, `RECEIVED`), `requestedAt`, `resolvedAt`
4. **`ReplenishmentPlan`**
   - `storeManager` (ObjectId Ref), `outlets` (Array of ObjectId Refs), `status` (`DRAFT`, `ACTIVE`, `PAUSED`), `items` (Array of required goods)
