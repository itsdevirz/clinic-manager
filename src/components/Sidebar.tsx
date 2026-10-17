import React from 'react';
import {
  LayoutDashboard,
  UserRoundPlus,
  UsersRound,
  CalendarClock,
  ShieldCheck,
  Settings2,
  ChevronLeft,
  Stethoscope,
  LockKeyhole,
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
    { id: 'dashboard' as TabType, label: 'نمای کلی', description: 'خلاصه فعالیت‌ها', icon: LayoutDashboard },
    { id: 'reception' as TabType, label: 'پذیرش بیمار', description: 'ثبت مراجعه جدید', icon: UserRoundPlus },
    { id: 'patients' as TabType, label: 'پرونده بیماران', description: 'اطلاعات و سوابق', icon: UsersRound },
    { id: 'followups' as TabType, label: 'پیگیری مراجعات', description: 'یادآوری نوبت‌ها', icon: CalendarClock, badge: overdueCount > 0 ? overdueCount : undefined },
    { id: 'management' as TabType, label: 'مدیریت مطب', description: 'گزارش‌ها و تنظیمات مدیریتی', icon: ShieldCheck, isProtected: true },
    { id: 'settings' as TabType, label: 'مشخصات مطب', description: 'اطلاعات و سربرگ', icon: Settings2 },
  ];

  return (
    <aside className="clinic-sidebar fixed top-0 right-0 z-30 flex h-screen w-64 flex-col no-print">
      <div className="clinic-brand flex h-[76px] items-center gap-3 px-5">
        <div className="clinic-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <img src="/logo.svg" alt="لوگوی کلینیک" className="h-8 w-8 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">سامانه یکپارچه</p>
          <h1 className="mt-0.5 truncate text-sm font-bold text-slate-900">{clinicName || 'مدیریت مطب'}</h1>
        </div>
      </div>

      <div className="px-5 pb-3 pt-5">
        <p className="clinic-nav-caption">فضای کاری</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`clinic-nav-item group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition-colors ${isActive ? 'is-active' : ''}`}
            >
              <span className="clinic-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="block truncate text-xs font-semibold">{item.label}</span>
                  {item.isProtected && <LockKeyhole className={`h-3 w-3 ${isUnlocked ? 'text-emerald-600' : 'text-slate-400'}`} />}
                </span>
                <span className="mt-1 block truncate text-[10px] font-normal text-slate-400">{item.description}</span>
              </span>
              {item.badge !== undefined && (
                <span className="clinic-nav-badge flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
            </button>
          );
        })}
      </nav>

      <div className="clinic-sidebar-footer mx-3 mb-3 rounded-xl p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal-700">
            <Stethoscope className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-700">مدیریت کلینیک</p>
            <p className="mt-0.5 text-[10px] text-slate-400">نسخه ۳.۲.۰</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500" title="برنامه فعال است" />
        </div>
      </div>
    </aside>
  );
};
