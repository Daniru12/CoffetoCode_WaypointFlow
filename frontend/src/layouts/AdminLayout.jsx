import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';

export const AdminLayout = () => {
  const location = useLocation();

  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/admin/depots')) {
      return {
        title: 'Depot & Fleet Hub',
        subtitle: 'Peliyagoda and Kandy logistics hubs, fleet assignments, maintenance state & fuel quotas'
      };
    }
    if (path.includes('/admin/outlets')) {
      return {
        title: 'Retail Outlet Network',
        subtitle: '120 commercial locations, delivery windows, dock specifications & van-only restrictions'
      };
    }
    if (path.includes('/admin/audit')) {
      return {
        title: 'Governance & Audit Trail',
        subtitle: 'Immutable record of operational overrides, plan releases, and fleet status transitions'
      };
    }
    return {
      title: 'Personnel & Role Directory',
      subtitle: 'Staff assignments, base depots, vehicle allocation, and authentication access'
    };
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Topbar title={title} subtitle={subtitle} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
