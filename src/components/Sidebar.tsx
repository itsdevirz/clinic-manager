import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  CalendarClock,
  ShieldCheck,
  Settings,
  ChevronRight,
  ChevronLeft,
  Stethoscope
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  overdueCount: number;
  isUnlocked: boolean;
  clinicName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  overdueCount,
  isUnlocked,
  clinicName,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'داشبورد',
      icon: LayoutDashboard,
    },
    {
      id: 'reception' as TabType,
      label: 'پذیرش',
      icon: UserPlus,
      highlight: true,
    },
    {
      id: 'patients' as TabType,
      label: 'پرونده بیماران',
      icon: Users,
    },
    {
      id: 'followups' as TabType,
      label: 'یادآوری مراجعات',
      icon: CalendarClock,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    {
      id: 'management' as TabType,
      label: 'مدیریت مطب',
      icon: ShieldCheck,
      isProtected: true,
    },
    {
      id: 'settings' as TabType,
      label: 'تنظیمات',
      icon: Settings,
    },
  ];

  return (
    <aside
      className="fixed top-0 right-0 z-30 h-screen w-64 bg-white border-l border-slate-200/80 flex flex-col no-print"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-amber-200/60 bg-white p-0.5 shadow-2xs">
            <img
              src="/logo.svg"
              alt="لوگوی کلینیک"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight">
              {clinicName || 'مدیریت مطب'}
            </h1>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />

              <span className="flex-1 text-right truncate">{item.label}</span>

              {/* Status / Badge */}
              {item.badge !== undefined && (
                <span className="text-[11px] font-mono tabular-nums text-rose-600 font-semibold px-1.5 py-0.2 bg-rose-50 rounded">
                  {item.badge}
                </span>
              )}

              {item.isProtected && (
                <span
                  className={`text-[10px] ${
                    isUnlocked ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {isUnlocked ? 'باز' : 'قفل'}
                </span>
              )}

              {/* Active line indicator on the right */}
              {isActive && (
                <span className="absolute right-0 top-2 bottom-2 w-1 bg-sky-500 rounded-l" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400">
        <div className="flex justify-between items-center">
          <span>نسخه نرم‌افزار:</span>
          <span className="font-mono tabular-nums">۳.۲.۰</span>
        </div>
      </div>
    </aside>
  );
};
