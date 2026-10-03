import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';

export const LoaderLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Topbar title="Warehouse Loading Bay" subtitle="Reverse stop-order loading, LIFO checklists, shortfalls & departure readiness" />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
