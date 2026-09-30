# WaypointFlow — Intelligent Delivery Operations Orchestration

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18+-lightgrey.svg)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5+-purple.svg)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://www.mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-black.svg)](https://socket.io)

WaypointFlow is an enterprise-grade delivery management and planning system developed for Waypoint Group's retail and logistics operations in Sri Lanka. It orchestrates the full delivery lifecycle from Store Manager order placement, Central Dispatcher delivery planning with a 10-rule constraint engine, Warehouse Consignment Loading (LIFO), Driver execution with offline-first support and digital signoff, to Store Manager receipt confirmation.

---

## 🏗️ System Architecture & Workflow

```text
  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
  │  Store Manager  │  ──>  │   Dispatcher    │  ──>  │  Warehouse Load │  ──>  │  Mobile Driver  │  ──>  │  Store Manager  │
  │  Create Order   │       │ Planning Console│       │  LIFO Checklist │       │ Route / POD     │       │ Confirm Receipt │
  └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
           │                         │                         │                         │                         │
           ▼                         ▼                         ▼                         ▼                         ▼
   16:00 Daily Cutoff        10-Rule Validation         LIFO Stop Packing         IndexedDB Offline        Goods Verification
   Auto-SLA Scheduling       Explainable Engine         Shortfall Reporting       Digital Canvas POD       Discrepancy Log
```

---

## 🚀 Key Features

### 1. Store Manager Experience
- **Interactive Dashboard**: Real-time status chips (`Pending`, `Scheduled`, `Loading`, `Out for Delivery`, `Delivered`, `Deferred`).
- **16:00 Daily Cutoff Rule**: Visual reminders and automatic delivery window assignment for next-morning delivery (e.g. 06:00 - 08:00).
- **Consignment Receipt**: Discrepancy quantity reporting, condition checklists, and photo evidence upload.

### 2. Dispatcher Planning Console & 10-Rule Constraint Engine
- **Sequential 10-Rule Validation**:
  1. `AVAILABILITY`: Vehicle active and not undergoing maintenance.
  2. `DEPOT`: Vehicle and outlet depot match (Peliyagoda / Colombo Hub).
  3. `TEMPERATURE`: Chilled cargo allocated strictly to refrigerated units (`CHILLED_VAN` / `CHILLED_TRUCK`).
  4. `ACCESS`: Low-clearance or narrow-access store outlets restricted to `VAN` only.
  5. `BRAND_DISTRICT`: Strict brand-depot district routing matrix.
  6. `WEIGHT`: Payload capacity enforcement with overload prevention.
  7. `VOLUME`: Cargo volume limit enforcement ($m^3$).
  8. `TRIP_LIMIT`: Max 2 trips per vehicle per operational day.
  9. `WINDOW`: Store delivery window feasibility analysis.
  10. `FUEL`: Max distance constraints (180 km max range).
- **Explainable Violations**: Instant feedback modal explaining why an assignment failed and recommending alternative fleet vehicles.
- **Transparent Deferrals**: Consecutive skip counter and next suggested run scheduling.
- **Capacity Forecasting**: Weekly predictive volume, reefer sizing, and driver scheduling models.

### 3. Warehouse Loader Experience
- **LIFO Reverse-Sequence Pack Checklist**: Pack items for the furthest/last stop first at the front of the cargo bed.
- **Shortfall & Damage Handling**: Mark missing or damaged inventory before departure.
- **Departure Readiness**: Mark jobs ready for fleet departure.

### 4. Driver Mobile & Offline-First Experience
- **Mobile-First Responsive UX**: Large touch targets and safe-stopped interaction design.
- **Offline Resilience via IndexedDB**:
  - Pre-cached routes and store stop manifests.
  - Local sync queue for arrivals, completed deliveries, signatures, and incident reports.
  - Automatic reconnection background flush and conflict detection.
- **Digital Proof of Delivery (POD)**: Touch/stylus signature canvas, camera photo capture, and receiver designation capture.

---

## 🎨 Design System

Tailored according to the submitted Designathon style guide:
- **Sidebar**: `#022F26` (Deep Evergreen)
- **Primary Accent**: `#025E4C` (Emerald)
- **Primary Hover**: `#B9E1C9` (Mint Glow)
- **Background**: `#F8FAFC` (Slate Tint)
- **Cards**: `#FFFFFF` with glassmorphic borders
- **Badges**: Standardized state tokens for `SCHEDULED`, `LOADING`, `IN_TRANSIT`, `DELIVERED`, `DEFERRED`, `OFFLINE`.

---

## 💻 Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **Maps**: Leaflet + OpenStreetMap
- **State & Realtime**: Context API + Socket.IO Client
- **Offline Storage**: IndexedDB (`idb`) + Event Ledger
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js + Express
- **Database**: MongoDB via Mongoose
- **Realtime**: Socket.IO
- **Storage**: Supabase Storage with offline base64 fallback
- **Validation**: Zod + 10-rule Constraint Engine
- **Auth**: JWT + bcryptjs

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:5000` with health check at `http://localhost:5000/health`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 🔑 Demo Role Accounts

For instant walkthrough and role testing, 1-click quick-login buttons are provided on the login page:

| Role | Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **Dispatcher** | `dispatcher@waypoint.lk` | `Waypoint2026!` | `/dispatcher/dashboard` |
| **Store Manager** | `store.colombo@waypoint.lk` | `Waypoint2026!` | `/store/dashboard` |
| **Warehouse Loader** | `loader@waypoint.lk` | `Waypoint2026!` | `/loader/jobs` |
| **Delivery Driver** | `driver.sunil@waypoint.lk` | `Waypoint2026!` | `/driver/route` |

---

## 🧪 Running Automated Tests
```bash
cd backend
npm test
```
All 5 unit and integration test suites validate the 10-rule constraint engine, auth middleware, and allocation logic.
