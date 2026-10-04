import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Truck,
  MapPin,
  Calendar,
  AlertTriangle,
  ClipboardList,
  Compass,
  FileCheck,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Users2,
  Package
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

import logoImg from '../../assets/logo.png';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role;

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { to: '/admin/users', label: 'Personnel & Roles', icon: LayoutDashboard },
          { to: '/admin/depots', label: 'Depots & Fleet Hub', icon: Truck },
          { to: '/admin/outlets', label: 'Outlet Network', icon: MapPin },
          { to: '/admin/store-managers-outlets', label: 'Store Managers & Outlets', icon: Users2 },
          { to: '/admin/audit', label: 'Governance & Audit', icon: ShieldCheck }
        ];
      case 'STORE_MANAGER':
        return [
          { to: '/store/dashboard', label: 'Store Dashboard', icon: LayoutDashboard },
          { to: '/store/inventory', label: 'My Inventory', icon: Package },
          { to: '/store/orders/create', label: 'Create Order', icon: PlusCircle },
          { to: '/store/orders', label: 'My Store Orders', icon: ShoppingCart },
          { to: '/store/replenishment-plans', label: 'Replenishment Plans', icon: Calendar }
        ];
      case 'DISPATCHER':
        return [
          { to: '/dispatcher/dashboard', label: 'Operations Overview', icon: LayoutDashboard },
          { to: '/dispatcher/orders', label: 'Orders Queue', icon: ShoppingCart },
          { to: '/dispatcher/planning', label: 'Delivery Planning', icon: Calendar },
          { to: '/dispatcher/deferrals', label: 'Deferral Management', icon: RotateCcw },
          { to: '/dispatcher/tracking', label: 'Live Operations & Map', icon: MapPin },
          { to: '/dispatcher/forecasts', label: 'Capacity Forecasts', icon: TrendingUp }
        ];
      case 'LOADER':
        return [
          { to: '/loader/jobs', label: 'Loading Jobs', icon: ClipboardList },
          { to: '/loader/inventory', label: 'Inventory Management', icon: FileCheck }
        ];
      case 'DRIVER':
        return [
          { to: '/driver/route', label: 'Today Route', icon: Compass },
          { to: '/driver/sync', label: 'Offline Sync Queue', icon: RotateCcw }
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--sidebar-bg)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <img
          src={logoImg}
          alt="WaypointFlow Logo"
          style={{
            height: '36px',
            width: 'auto',
            objectFit: 'contain'
          }}
        />
        <div>
          <h2 style={{ fontSize: '1.1rem', color: '#FFFFFF', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            WaypointFlow
          </h2>
          <span style={{ fontSize: '0.7rem', color: '#B9E1C9', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Logistics Engine
          </span>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '0.75rem'
      }}>
        <span style={{ color: '#94A3B8' }}>Active Workspace:</span>
        <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px' }}>
          {role?.replace('_', ' ')}
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#FFFFFF' : '#CBD5E1',
                backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)'
              })}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div style={{
        padding: '1.25rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            {user?.depot ? `${user.depot} Depot` : 'Headquarters'}
          </div>
        </div>
      </div>
    </aside>
  );
};
