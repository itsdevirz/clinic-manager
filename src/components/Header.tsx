import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Menu
} from 'lucide-react';
import { TabType } from '../types';
import { getTodayPersianDate, formatPersianDateReadable, PERSIAN_WEEKDAYS } from '../utils/persianDate';

interface HeaderProps {
  currentTab: TabType;
  onOpenReception?: () => void;
  onOpenSearch: () => void;
  isUnlocked?: boolean;
  onToggleLock?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenSearch,
  onOpenMobileMenu,
}) => {
  const tabTitles: Record<TabType, string> = {
    dashboard: 'داشبورد مدیریت مطب',
    reception: 'پذیرش',
    patients: 'بانک اطلاعات و پرونده بیماران',
    followups: 'پیگیری و یادآوری مراجعات بعدی',
    management: 'مدیریت مطب و گزارش‌های مالی',
    settings: 'تنظیمات و پشتیبان‌گیری',
  };

  const todayStr = getTodayPersianDate();
  const todayReadable = formatPersianDateReadable(todayStr);
  const now = new Date();
  const weekdayName = PERSIAN_WEEKDAYS[now.getDay()];

  // Live Iranian time clock (HH:MM)
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between transition-all duration-200 no-print`}
    >
      {/* Zone 1: Section Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          aria-label="منو"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
            {tabTitles[currentTab]}
          </h2>
        </div>
      </div>

      {/* Zone 2: Date & Quick Search Affordance */}
      <div className="hidden lg:flex items-center gap-3.5 text-xs text-slate-500">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-sky-300 hover:shadow-2xs text-slate-500 hover:text-slate-800 transition-all cursor-pointer group"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
          <span>جستجوی سریع پرونده...</span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 bg-white border border-slate-200/80 rounded-md text-slate-400 group-hover:text-slate-600 group-hover:border-slate-300 transition-colors shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Selected Component: Date & Shift Indicator */}
        <div className="flex items-center gap-2.5 text-xs bg-white hover:bg-slate-50/60 px-3.5 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs transition-all group select-none">
          <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-100/90 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Calendar className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800">{weekdayName}</span>
            <span className="text-slate-300 font-light" aria-hidden="true">·</span>
            <span className="font-medium text-slate-600 font-mono tabular-nums">{todayReadable}</span>
          </div>

          <div className="h-3.5 w-px bg-slate-200 mx-0.5" aria-hidden="true" />

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="font-mono tabular-nums font-semibold text-slate-700">{currentTime}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 animate-pulse" title="مطب فعال و آنلاین" />
          </div>
        </div>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5">
      </div>
    </header>
  );
};

