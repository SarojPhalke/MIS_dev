import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItemsByRole = {
  operator: ['dashboard', 'assets', 'breakdown'],
  engineer: ['dashboard', 'breakdown', 'preventive', 'spares'],
  manager: ['dashboard', 'kpi'],
  admin: ['dashboard', 'assets', 'preventive', 'breakdown', 'spares', 'utilities', 'kpi', 'analytics', 'users']
};

const allNavItems = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard' },
  { key: 'assets', label: 'Asset Register', to: '/assets' },
  { key: 'preventive', label: 'Preventive Maintenance', to: '/preventive' },
  { key: 'breakdown', label: 'Breakdown Maintenance', to: '/breakdown' },
  { key: 'spares', label: 'Spares Inventory', to: '/spares' },
  { key: 'utilities', label: 'Utilities Monitoring', to: '/utilities' },
  { key: 'kpi', label: 'KPI Monitoring & Reports', to: '/kpi' },
  { key: 'analytics', label: 'Analytics', to: '/analytics' },
  { key: 'users', label: 'User Management', to: '/users' }
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const allowedKeys = navItemsByRole[user?.role] || [];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <h1 className="text-lg font-semibold text-accent">MIS Portal</h1>
          <p className="text-xs text-slate-400">Maintenance Information System</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {allNavItems
            .filter((item) => allowedKeys.includes(item.key))
            .map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? 'bg-slate-800 text-accent' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
          <div className="md:hidden">
            <span className="text-accent font-semibold">MIS Portal</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {user && (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold capitalize text-accent">
                  {user.role}
                </span>
              </>
            )}
            <button
              onClick={logout}
              className="ml-2 rounded-md bg-danger px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

