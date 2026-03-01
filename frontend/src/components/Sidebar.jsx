/**
 * components/Sidebar.jsx — Navigasi utama GRC platform
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield, LayoutDashboard, Building2, Package, AlertTriangle,
  ClipboardCheck, BarChart3, FileText, Bot, LogOut, ChevronRight,
  User, Lock
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'main' },
  { to: '/organizations', icon: Building2, label: 'Organisasi', group: 'main' },
  { to: '/assets', icon: Package, label: 'Inventaris Aset', group: 'main' },
  { to: '/risk', icon: AlertTriangle, label: 'Risk Assessment', group: 'assessment' },
  { to: '/audit', icon: ClipboardCheck, label: 'Audit Checklist', group: 'assessment' },
  { to: '/compliance', icon: BarChart3, label: 'Compliance', group: 'assessment' },
  { to: '/ai-assistant', icon: Bot, label: 'AI Assistant', group: 'tools' },
  { to: '/reports', icon: FileText, label: 'Laporan', group: 'tools' },
];

const GROUP_LABELS = {
  main: 'MANAJEMEN',
  assessment: 'AUDIT & RISIKO',
  tools: 'TOOLS'
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Group nav items
  const groups = {};
  NAV_ITEMS.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  const roleColors = {
    admin: 'bg-red-100 text-red-700',
    auditor: 'bg-blue-100 text-blue-700',
    auditee: 'bg-green-100 text-green-700'
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-primary-950 flex flex-col z-50 select-none">
      {/* Logo */}
<div className="px-5 py-5 border-b border-primary-800">
  <div className="flex items-center gap-3">
    <img
      src="/logo.png"
      alt="SRM Audit"
      className="h-9 w-auto object-contain"
    />
    <div>
      <p className="text-white font-bold text-sm leading-tight">SRM Audit</p>
      <p className="text-primary-300 text-xs">Platform v1.0</p>
    </div>
  </div>
</div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="text-primary-400 text-[10px] font-bold tracking-widest px-3 mb-1.5">
              {GROUP_LABELS[group]}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                      isActive
                        ? 'nav-link-active'
                        : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                    }`
                  }
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-primary-800 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-primary-900 rounded-lg">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
            <p className="text-primary-300 text-[10px] truncate">{user?.email}</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 px-3">
          <Lock size={10} className="text-primary-400" />
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${roleColors[user?.role] || 'bg-slate-100 text-slate-600'}`}>
            {user?.role}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-primary-300 hover:text-red-400 hover:bg-red-900/20 rounded-lg text-sm transition-colors"
        >
          <LogOut size={15} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
