import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';

export const DispatcherLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Topbar title="Dispatcher Control Tower" subtitle="Order queue allocation, 10-constraint engine, deferrals & fleet orchestration" />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
