import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Search,
  PhoneCall,
  CheckCircle2,
  XCircle,
  PhoneOff,
  AlertCircle,
  Clock,
  UserCheck,
  ChevronLeft
} from 'lucide-react';
import { FollowUpReminder, FollowUpStatus } from '../../types';
import {
  getTodayPersianDate,
  addDaysToPersianDate,
  formatPersianDateReadable,
  comparePersianDates
} from '../../utils/persianDate';
import { PersianDatePicker } from '../Common/PersianDatePicker';

interface FollowUpsViewProps {
  followUps: FollowUpReminder[];
  onUpdateFollowUpStatus: (id: string, status: FollowUpStatus, notes?: string, newDate?: string) => void;
  onOpenReceptionForPatient: (patientId: string) => void;
  onOpenPatientDossier: (patientId: string) => void;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  followUps,
  onUpdateFollowUpStatus,
  onOpenReceptionForPatient,
  onOpenPatientDossier,
}) => {
  const [activeFilter, setActiveFilter] = useState<'today' | 'tomorrow' | 'week' | 'month' | 'overdue' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const today = getTodayPersianDate();
  const tomorrow = addDaysToPersianDate(today, 1);
  const next7Days = addDaysToPersianDate(today, 7);
  const next30Days = addDaysToPersianDate(today, 30);

  // Status mapping
  const statusLabels: Record<FollowUpStatus, { label: string; color: string }> = {
    pending: { label: 'در انتظار مراجعه', color: 'text-sky-700 bg-sky-50' },
    attended: { label: 'مراجعه شد', color: 'text-emerald-700 bg-emerald-50' },
    cancelled: { label: 'لغو شد', color: 'text-slate-500 bg-slate-100' },
    no_answer: { label: 'عدم پاسخ تماس', color: 'text-amber-700 bg-amber-50' },
    overdue: { label: 'عقب‌افتاده', color: 'text-rose-700 bg-rose-50' },
  };

  // Filtered follow ups
  const filteredFollowUps = useMemo(() => {
    return followUps
      .filter((f) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matches =
            f.patientName.toLowerCase().includes(q) ||
            f.patientPhone.includes(q) ||
            f.serviceName.toLowerCase().includes(q) ||
            f.operatorName.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Status filter
        if (selectedStatusFilter !== 'all' && f.status !== selectedStatusFilter) {
          return false;
        }

        // Time period filter
        if (activeFilter === 'today') {
          return f.scheduledDate === today;
        } else if (activeFilter === 'tomorrow') {
          return f.scheduledDate === tomorrow;
        } else if (activeFilter === 'week') {
          return f.scheduledDate >= today && f.scheduledDate <= next7Days;
        } else if (activeFilter === 'month') {
          return f.scheduledDate >= today && f.scheduledDate <= next30Days;
        } else if (activeFilter === 'overdue') {
          return f.scheduledDate < today && f.status !== 'attended' && f.status !== 'cancelled';
        }

        return true;
      })
      .sort((a, b) => comparePersianDates(a.scheduledDate, b.scheduledDate));
  }, [followUps, searchQuery, selectedStatusFilter, activeFilter, today, tomorrow, next7Days, next30Days]);

  // Counts for each filter
  const counts = useMemo(() => {
    return {
      today: followUps.filter((f) => f.scheduledDate === today).length,
      tomorrow: followUps.filter((f) => f.scheduledDate === tomorrow).length,
      week: followUps.filter((f) => f.scheduledDate >= today && f.scheduledDate <= next7Days).length,
      month: followUps.filter((f) => f.scheduledDate >= today && f.scheduledDate <= next30Days).length,
      overdue: followUps.filter((f) => f.scheduledDate < today && f.status !== 'attended' && f.status !== 'cancelled').length,
      all: followUps.length,
    };
  }, [followUps, today, tomorrow, next7Days, next30Days]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">پیگیری و یادآوری مراجعه بعدی بیماران</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              سیستم هماهنگی جلسات ماهانه، تمدید بوتاکس/فیلر و ویزیت‌های بعد از عمل
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            امروز: {formatPersianDateReadable(today)}
          </span>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs">
          {[
            { id: 'today', label: 'مراجعه امروز', count: counts.today },
            { id: 'tomorrow', label: 'فردا', count: counts.tomorrow },
            { id: 'week', label: 'این هفته', count: counts.week },
            { id: 'month', label: 'این ماه', count: counts.month },
            { id: 'overdue', label: 'مراجعات عقب‌افتاده', count: counts.overdue, danger: counts.overdue > 0 },
            { id: 'all', label: 'همه مراجعات', count: counts.all },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                activeFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                  tab.danger
                    ? 'bg-rose-100 text-rose-700 font-bold'
                    : activeFilter === tab.id
                    ? 'bg-slate-100 text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در لیست با نام بیمار، شماره تماس، خدمت یا اپراتور..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار مراجعه</option>
            <option value="attended">مراجعه شد</option>
            <option value="overdue">عقب‌افتاده</option>
            <option value="no_answer">عدم پاسخ</option>
            <option value="cancelled">لغو شد</option>
          </select>
        </div>
      </div>

      {/* Follow-up List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredFollowUps.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarClock className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-600">
              هیچ نوبت پیگیری در این بازه یافت نشد
            </p>
            <p className="text-xs text-slate-400 mt-1">
              زمان یا فیلتر وضعیت را تغییر دهید یا در بخش پذیرش برای بیمار نوبت جدید تنظیم کنید
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[320px] pb-12">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-4 font-semibold">نام بیمار</th>
                  <th className="py-3 px-4 font-semibold">شماره تماس</th>
                  <th className="py-3 px-4 font-semibold">خدمت / علت مراجعه</th>
                  <th className="py-3 px-4 font-semibold">اپراتور</th>
                  <th className="py-3 px-4 font-semibold">مراجعه قبلی</th>
                  <th className="py-3 px-4 font-semibold">تاریخ موعد بعدی</th>
                  <th className="py-3 px-4 font-semibold">وضعیت پیگیری</th>
                  <th className="py-3 px-4 font-semibold text-center">اقدام سریع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFollowUps.map((item) => {
                  const isTodayItem = item.scheduledDate === today;
                  const isOverdueItem = item.scheduledDate < today && item.status !== 'attended' && item.status !== 'cancelled';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTodayItem ? 'bg-sky-50/30' : isOverdueItem ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onOpenPatientDossier(item.patientId)}
                          className="font-bold text-slate-900 hover:text-sky-600 transition-colors text-right"
                        >
                          {item.patientName}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`tel:${item.patientPhone}`}
                          className="text-slate-600 hover:text-sky-700 flex items-center gap-1.5 font-mono tabular-nums"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.patientPhone}</span>
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{item.serviceName}</span>
                        {item.reason && (
                          <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {item.reason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.operatorName}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500 text-[11px]">
                        {formatPersianDateReadable(item.previousVisitDate)}
                      </td>
                      <td className="py-3 px-4 min-w-[170px]">
                        <PersianDatePicker
                          value={item.scheduledDate}
                          presets={[]}
                          onChange={(newDate) => {
                            onUpdateFollowUpStatus(item.id, item.status, item.notes, newDate);
                          }}
                        />
                        {isTodayItem && (
                          <span className="block text-[10px] text-sky-600 font-bold mt-0.5">موعد امروز</span>
                        )}
                        {isOverdueItem && (
                          <span className="block text-[10px] text-rose-600 font-bold mt-0.5">عقب‌افتاده</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            onUpdateFollowUpStatus(item.id, e.target.value as FollowUpStatus)
                          }
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-sky-500"
                        >
                          <option value="pending">در انتظار مراجعه</option>
                          <option value="attended">مراجعه شد</option>
                          <option value="overdue">عقب‌افتاده</option>
                          <option value="no_answer">عدم پاسخ</option>
                          <option value="cancelled">لغو شد</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenReceptionForPatient(item.patientId)}
                            className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-medium transition-colors"
                          >
                            + ثبت پذیرش
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
