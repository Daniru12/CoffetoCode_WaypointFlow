import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { DispatcherLayout } from './layouts/DispatcherLayout';
import { LoaderLayout } from './layouts/LoaderLayout';
import { DriverLayout } from './layouts/DriverLayout';

// Pages
import { Login } from './pages/auth/Login';

// Admin Pages
import { UserManagement } from './pages/admin/UserManagement';
import { DepotFleetManagement } from './pages/admin/DepotFleetManagement';
import { OutletManagement } from './pages/admin/OutletManagement';
import { AuditLogs } from './pages/admin/AuditLogs';

// Store Manager Pages
import { StoreDashboard } from './pages/store/Dashboard';
import { CreateOrder } from './pages/store/CreateOrder';
import { StoreOrders } from './pages/store/Orders';
import { OrderDetails } from './pages/store/OrderDetails';
import { ConfirmReceipt } from './pages/store/ConfirmReceipt';

// Dispatcher Pages
import { DispatcherDashboard } from './pages/dispatcher/Dashboard';
import { OrdersQueue } from './pages/dispatcher/OrdersQueue';
import { PlanningConsole } from './pages/dispatcher/Planning';
import { DeferralManagement } from './pages/dispatcher/Deferrals';
import { LiveTracking } from './pages/dispatcher/LiveTracking';
import { CapacityForecast } from './pages/dispatcher/CapacityForecast';

// Loader Pages
import { LoaderJobs } from './pages/loader/Jobs';
import { LoaderChecklist } from './pages/loader/Checklist';

// Driver Pages
import { TodayRoute } from './pages/driver/TodayRoute';
import { CurrentStop } from './pages/driver/CurrentStop';
import { DriverPOD } from './pages/driver/POD';
import { DriverIncident } from './pages/driver/Incident';
import { OfflineSync } from './pages/driver/OfflineSync';

// Styles
import './styles/variables.css';
import './styles/globals.css';
import './styles/responsive.css';

// Root Redirect Helper
const RootRedirect = () => {
  const { isAuthenticated, user, getRoleRedirect } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleRedirect(user?.role)} replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Admin Workspace */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="users" element={<UserManagement />} />
              <Route path="depots" element={<DepotFleetManagement />} />
              <Route path="outlets" element={<OutletManagement />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route index element={<Navigate to="users" replace />} />
            </Route>

            {/* Store Manager Workspace */}
            <Route
              path="/store"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['STORE_MANAGER']}>
                    <StoreLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<StoreDashboard />} />
              <Route path="orders" element={<StoreOrders />} />
              <Route path="orders/create" element={<CreateOrder />} />
              <Route path="orders/:orderId" element={<OrderDetails />} />
              <Route path="deliveries/:deliveryId/receipt" element={<ConfirmReceipt />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Central Dispatcher Workspace */}
            <Route
              path="/dispatcher"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['DISPATCHER']}>
                    <DispatcherLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DispatcherDashboard />} />
              <Route path="orders" element={<OrdersQueue />} />
              <Route path="planning" element={<PlanningConsole />} />
              <Route path="deferrals" element={<DeferralManagement />} />
              <Route path="tracking" element={<LiveTracking />} />
              <Route path="forecasts" element={<CapacityForecast />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Warehouse Loader Workspace */}
            <Route
              path="/loader"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['LOADER']}>
                    <LoaderLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="jobs" element={<LoaderJobs />} />
              <Route path="jobs/:jobId" element={<LoaderChecklist />} />
              <Route index element={<Navigate to="jobs" replace />} />
            </Route>

            {/* Driver Mobile Workspace */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['DRIVER']}>
                    <DriverLayout />
                  </RoleRoute>
                </ProtectedRoute>
              }
            >
              <Route path="route" element={<TodayRoute />} />
              <Route path="trips/:tripId/stops" element={<CurrentStop />} />
              <Route path="deliveries/:deliveryId/pod" element={<DriverPOD />} />
              <Route path="deliveries/:deliveryId/incident" element={<DriverIncident />} />
              <Route path="sync" element={<OfflineSync />} />
              <Route index element={<Navigate to="route" replace />} />
            </Route>

            {/* Root & Catch-all */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
