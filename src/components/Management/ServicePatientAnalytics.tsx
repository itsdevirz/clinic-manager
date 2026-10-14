import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  Calendar,
  Layers,
  TrendingUp,
  Sparkles,
  Zap,
  Phone,
  Copy,
  Check,
  Eye,
  FileText,
  X,
  UserCheck,
  ChevronDown,
  ArrowUpDown,
  Filter,
  DollarSign
} from 'lucide-react';
import { Admission, Patient, ServiceCategory } from '../../types';
import {
  formatToman,
  formatPersianDateReadable,
  getTodayPersianDate,
  parsePersianDate,
  PERSIAN_MONTHS,
  addDaysToPersianDate
} from '../../utils/persianDate';

interface ServicePatientAnalyticsProps {
  admissions: Admission[];
  patients?: Patient[];
  onOpenPatientDossier?: (patientId: string) => void;
  onPrintAdmission?: (admission: Admission) => void;
}

type PeriodFilter = 'this_month' | 'last_month' | 'last_3_months' | 'today' | 'this_year' | 'all' | 'custom';
type DeptFilter = 'all' | 'beauty' | 'laser_women' | 'laser_men';

interface ServiceStat {
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  department: 'beauty' | 'laser_women' | 'laser_men';
  totalProcedures: number;         // تعداد دفعات/جلسات ارائه شده
  uniquePatientsCount: number;     // تعداد بیماران یکتا (مثلا ۳۰۰ نفر)
  patientIds: Set<string>;
  totalRevenue: number;            // کل درآمد حاصله
  admissions: Admission[];
}

export const ServicePatientAnalytics: React.FC<ServicePatientAnalyticsProps> = ({
  admissions,
  patients = [],
  onOpenPatientDossier,
  onPrintAdmission,
}) => {
  const today = getTodayPersianDate();
  const todayParts = useMemo(() => parsePersianDate(today), [today]);

  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [customStart, setCustomStart] = useState<string>(() => addDaysToPersianDate(today, -30));
  const [customEnd, setCustomEnd] = useState<string>(today);

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [sortBy, setSortBy] = useState<'patients' | 'procedures' | 'revenue'>('patients');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Selected service for modal drilldown
  const [selectedServiceStat, setSelectedServiceStat] = useState<ServiceStat | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Helper to determine department from category
  const getDepartment = (cat: ServiceCategory): 'beauty' | 'laser_women' | 'laser_men' => {
    if (cat === 'laser_women') return 'laser_women';
    if (cat === 'laser_men') return 'laser_men';
    return 'beauty';
  };

  // Filter admissions by period
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((adm) => {
      if (adm.status === 'cancelled') return false;
      const admDate = adm.date;

      if (period === 'today') {
        return admDate === today;
      }
      if (period === 'this_month') {
        const currentMonthPrefix = `${todayParts.year}/${String(todayParts.month).padStart(2, '0')}`;
        return admDate.startsWith(currentMonthPrefix);
      }
      if (period === 'last_month') {
        let prevYear = todayParts.year;
        let prevMonth = todayParts.month - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const prevMonthPrefix = `${prevYear}/${String(prevMonth).padStart(2, '0')}`;
        return admDate.startsWith(prevMonthPrefix);
      }
      if (period === 'last_3_months') {
        const threeMonthsAgoDate = addDaysToPersianDate(today, -90);
        return admDate >= threeMonthsAgoDate && admDate <= today;
      }
      if (period === 'this_year') {
        return admDate.startsWith(`${todayParts.year}/`);
      }
      if (period === 'custom') {
        const s = customStart || '0000/00/00';
        const e = customEnd || '9999/99/99';
        return admDate >= s && admDate <= e;
      }
      return true; // 'all'
    });
  }, [admissions, period, today, todayParts, customStart, customEnd]);

  // Aggregate stats per service
  const serviceStatsMap = useMemo(() => {
    const map = new Map<string, ServiceStat>();

    filteredAdmissions.forEach((adm) => {
      const key = adm.serviceName.trim() || adm.serviceId || 'سایر خدمات';
      let stat = map.get(key);
      if (!stat) {
        stat = {
          serviceId: adm.serviceId,
          serviceName: key,
          category: adm.serviceCategory,
          department: getDepartment(adm.serviceCategory),
          totalProcedures: 0,
          uniquePatientsCount: 0,
          patientIds: new Set<string>(),
          totalRevenue: 0,
          admissions: [],
        };
        map.set(key, stat);
      }

      stat.totalProcedures += adm.quantity || 1;
      const pid = adm.patientId || adm.patientPhone || adm.patientName;
      stat.patientIds.add(pid);
      stat.totalRevenue += adm.paidAmount || adm.finalAmount || 0;
      stat.admissions.push(adm);
    });

    // Compute unique counts
    map.forEach((stat) => {
      stat.uniquePatientsCount = stat.patientIds.size;
    });

    return map;
  }, [filteredAdmissions]);

  // Filter and sort the service stats
  const serviceStatsList = useMemo(() => {
    let list = Array.from(serviceStatsMap.values());

    // Filter by department
    if (deptFilter !== 'all') {
      list = list.filter((s) => s.department === deptFilter);
    }

    // Filter by search query (نام خدمت یا دسته‌بندی)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.serviceName.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.department === 'laser_women' && q.includes('لیزر')) ||
          (s.department === 'laser_men' && q.includes('لیزر')) ||
          (s.serviceName.includes('لیزر') && q.includes('لیزر')) ||
          (s.serviceName.includes('بوتاکس') && q.includes('بوتاکس')) ||
          (s.serviceName.includes('پی آر پی') && (q.includes('prp') || q.includes('پی ار پی') || q.includes('پی آر پی')))
      );
    }

    // Sort
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'patients') {
        diff = a.uniquePatientsCount - b.uniquePatientsCount;
      } else if (sortBy === 'procedures') {
        diff = a.totalProcedures - b.totalProcedures;
      } else if (sortBy === 'revenue') {
        diff = a.totalRevenue - b.totalRevenue;
      }
      return sortOrder === 'desc' ? -diff : diff;
    });

    return list;
  }, [serviceStatsMap, deptFilter, searchQuery, sortBy, sortOrder]);

  // Overall KPI totals for the selected period
  const overallKPIs = useMemo(() => {
    const allUniquePatientIds = new Set<string>();
    let totalProcedures = 0;
    let totalRevenue = 0;

    filteredAdmissions.forEach((adm) => {
      allUniquePatientIds.add(adm.patientId || adm.patientPhone || adm.patientName);
      totalProcedures += adm.quantity || 1;
      totalRevenue += adm.paidAmount || 0;
    });

    // Top service
    const sortedByPatients = Array.from(serviceStatsMap.values()).sort(
      (a, b) => b.uniquePatientsCount - a.uniquePatientsCount
    );
    const topService = sortedByPatients.length > 0 ? sortedByPatients[0] : null;

    // Macro category groups (لیزر، بوتاکس، پی‌آرپی، ژل و فیلر، سایر)
    const laserPatients = new Set<string>();
    const botoxPatients = new Set<string>();
    const prpPatients = new Set<string>();
    const fillerPatients = new Set<string>();
    const otherPatients = new Set<string>();

    filteredAdmissions.forEach((adm) => {
      const pid = adm.patientId || adm.patientPhone || adm.patientName;
      const cat = adm.serviceCategory;
      const sName = adm.serviceName.toLowerCase();

      if (cat === 'laser_women' || cat === 'laser_men' || cat === 'laser' || sName.includes('لیزر')) {
        laserPatients.add(pid);
      } else if (cat === 'botox' || sName.includes('بوتاکس')) {
        botoxPatients.add(pid);
      } else if (cat === 'prp' || sName.includes('پی آر پی') || sName.includes('prp')) {
        prpPatients.add(pid);
      } else if (cat === 'filler' || cat === 'mesogel' || sName.includes('فیلر') || sName.includes('ژل')) {
        fillerPatients.add(pid);
      } else {
        otherPatients.add(pid);
      }
    });

    return {
      totalUniquePatients: allUniquePatientIds.size,
      totalProcedures,
      totalRevenue,
      topService,
      macroGroups: [
        { label: 'خدمات لیزر (بانوان و آقایان)', count: laserPatients.size, color: 'bg-indigo-500' },
        { label: 'تزریق بوتاکس', count: botoxPatients.size, color: 'bg-emerald-500' },
        { label: 'پی آر پی (PRP)', count: prpPatients.size, color: 'bg-rose-500' },
        { label: 'فیلر و مزوژل جوانساز', count: fillerPatients.size, color: 'bg-amber-500' },
        { label: 'سایر خدمات و جراحی‌ها', count: otherPatients.size, color: 'bg-purple-500' },
      ],
    };
  }, [filteredAdmissions, serviceStatsMap]);

  // Period label for display
  const periodLabel = useMemo(() => {
    switch (period) {
      case 'this_month':
        return `این ماه (${PERSIAN_MONTHS[todayParts.month - 1]} ${todayParts.year})`;
      case 'last_month': {
        let m = todayParts.month - 1;
        let y = todayParts.year;
        if (m === 0) {
          m = 12;
          y -= 1;
        }
        return `ماه گذشته (${PERSIAN_MONTHS[m - 1]} ${y})`;
      }
      case 'last_3_months':
        return '۳ ماه اخیر';
      case 'today':
        return `امروز (${formatPersianDateReadable(today)})`;
      case 'this_year':
        return `سال جاری (${todayParts.year})`;
      case 'custom':
        return `از ${formatPersianDateReadable(customStart)} تا ${formatPersianDateReadable(customEnd)}`;
      case 'all':
      default:
        return 'کل دوره‌ها (تمام تاریخچه)';
    }
  }, [period, todayParts, today, customStart, customEnd]);

  // Patients inside the selected service drilldown modal
  const modalFilteredAdmissions = useMemo(() => {
    if (!selectedServiceStat) return [];
    if (!modalSearch.trim()) return selectedServiceStat.admissions;
    const q = modalSearch.trim().toLowerCase();
    return selectedServiceStat.admissions.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientPhone.includes(q) ||
        a.admissionNumber.toLowerCase().includes(q) ||
        a.operatorName.toLowerCase().includes(q)
    );
  }, [selectedServiceStat, modalSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Description */}
      <div className="bg-gradient-to-l from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
          <Users className="w-56 h-56 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-medium mb-2 border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>کارتابل آمار مراجعین و خدمات ارائه شده</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              آمار دقیق تعداد بیماران به تفکیک خدمات
            </h3>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              مشاهده و جستجوی لحظه‌ای تعداد افرادی که در هر بازه زمانی خدمات مختلف (لیزر، بوتاکس، پی آر پی، فیلر و...) را دریافت کرده‌اند به همراه لیست کامل مراجعین جهت پیگیری و آنالیز.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center min-w-[200px]">
            <span className="text-[11px] text-indigo-200 block">بازه زمانی فعال گزارش:</span>
            <span className="text-sm font-bold text-amber-300 block mt-0.5">{periodLabel}</span>
            <span className="text-xs text-white/80 block mt-1 font-mono font-bold">
              {overallKPIs.totalUniquePatients} بیمار یکتا | {overallKPIs.totalProcedures} خدمت
            </span>
          </div>
        </div>
      </div>

      {/* Period Filter Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">انتخاب دوره زمانی گزارش:</span>
          </div>

          {/* Quick period buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                period === 'this_month'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📅 این ماه ({PERSIAN_MONTHS[todayParts.month - 1]})
            </button>
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                period === 'today'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              امروز
            </button>
            <button
              onClick={() => setPeriod('last_month')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                period === 'last_month'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ماه گذشته
            </button>
            <button
              onClick={() => setPeriod('last_3_months')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                period === 'last_3_months'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ۳ ماه گذشته (فصل)
            </button>
            <button
              onClick={() => setPeriod('this_year')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                period === 'this_year'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              سال {todayParts.year}
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                period === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              کل تاریخچه
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                period === 'custom'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              بازه دلخواه...
            </button>
          </div>
        </div>

        {/* Custom date range inputs if selected */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="font-bold text-slate-700">از تاریخ:</span>
            <input
              type="text"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              placeholder="1403/07/01"
              className="px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-center w-32 focus:outline-hidden focus:border-indigo-500"
            />
            <span className="font-bold text-slate-700">تا تاریخ:</span>
            <input
              type="text"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              placeholder="1403/07/30"
              className="px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-center w-32 focus:outline-hidden focus:border-indigo-500"
            />
            <span className="text-slate-500">فرمت: سال/ماه/روز شمسی</span>
          </div>
        )}

        {/* Search & Department Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Search box */}
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی سریع خدمات (مثلاً: لیزر، بوتاکس، پی آر پی، فیلر، هایفو...)"
              className="w-full pr-9 pl-8 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department pills */}
          <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-1.5 text-xs overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all' as DeptFilter, label: 'همه لاین‌ها' },
              { id: 'beauty' as DeptFilter, label: '🌸 زیبایی و درمانی' },
              { id: 'laser_women' as DeptFilter, label: '⚡ لیزر بانوان' },
              { id: 'laser_men' as DeptFilter, label: '🔷 لیزر آقایان' },
            ].map((dept) => (
              <button
                key={dept.id}
                onClick={() => setDeptFilter(dept.id)}
                className={`px-2.5 py-2 rounded-xl whitespace-nowrap text-xs font-medium transition-all ${
                  deptFilter === dept.id
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dept.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Macro Groups Comparison Banner (نمای اجمالی لاین‌های اصلی) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>توزیع بیماران در لاین‌های درمانی ({periodLabel})</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              تعداد مراجعین تفکیک‌شده به لاین‌های لیزر، بوتاکس، پی آر پی و ژل
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            مجموع {overallKPIs.totalUniquePatients} بیمار یکتا
          </span>
        </div>

        {/* Visual progress bar comparison */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {overallKPIs.macroGroups.map((g, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all cursor-pointer"
              onClick={() => {
                if (g.label.includes('لیزر')) setSearchQuery('لیزر');
                else if (g.label.includes('بوتاکس')) setSearchQuery('بوتاکس');
                else if (g.label.includes('پی آر پی')) setSearchQuery('پی آر پی');
                else if (g.label.includes('فیلر')) setSearchQuery('فیلر');
                else setSearchQuery('');
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600 font-medium truncate">{g.label}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${g.color}`} />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  {g.count}
                </span>
                <span className="text-xs text-slate-500">نفر بیمار</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full ${g.color} transition-all duration-500`}
                  style={{
                    width: `${
                      overallKPIs.totalUniquePatients > 0
                        ? Math.min(100, Math.round((g.count / overallKPIs.totalUniquePatients) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sorting bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="text-slate-500 font-medium">
          نمایش <span className="font-bold text-slate-800">{serviceStatsList.length}</span> خدمت
          {searchQuery && (
            <span> مطابق با جستجوی «<strong className="text-indigo-600">{searchQuery}</strong>»</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">مرتب‌سازی بر اساس:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                if (sortBy === 'patients') setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                else {
                  setSortBy('patients');
                  setSortOrder('desc');
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'patients' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              👥 تعداد بیماران {sortBy === 'patients' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'procedures') setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                else {
                  setSortBy('procedures');
                  setSortOrder('desc');
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'procedures' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              ⚡ تعداد جلسات {sortBy === 'procedures' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'revenue') setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                else {
                  setSortBy('revenue');
                  setSortOrder('desc');
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'revenue' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              💰 درآمد {sortBy === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>

      {/* Services List Table / Cards */}
      {serviceStatsList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">هیچ خدمتی در این بازه یافت نشد</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            برای این بازه زمانی پذیرشی ثبت نشده یا با فیلتر جستجوی شما مطابقت ندارد.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setDeptFilter('all');
              setPeriod('all');
            }}
            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all"
          >
            نمایش کل خدمات و دوره‌ها
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceStatsList.map((stat) => {
            return (
              <div
                key={stat.serviceName}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        stat.department === 'laser_women'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : stat.department === 'laser_men'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {stat.department === 'laser_women'
                        ? 'لیزر بانوان'
                        : stat.department === 'laser_men'
                        ? 'لیزر آقایان'
                        : 'خدمات زیبایی و پوست'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {stat.totalProcedures} جلسه
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-indigo-700 transition-colors">
                    {stat.serviceName}
                  </h4>

                  {/* Highlights (Unique Patients Count - Big Numbers) */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">تعداد بیماران یکتا:</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-mono text-2xl font-black text-indigo-700 tabular-nums">
                          {stat.uniquePatientsCount}
                        </span>
                        <span className="text-xs font-bold text-slate-700">نفر</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[11px] text-slate-500 block">کل دفعات انجام:</span>
                      <div className="flex items-baseline justify-end gap-1 mt-0.5">
                        <span className="font-mono text-xl font-bold text-slate-800 tabular-nums">
                          {stat.totalProcedures}
                        </span>
                        <span className="text-xs text-slate-500">بار</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Info */}
                  <div className="mt-3 flex items-center justify-between text-xs py-1.5 border-t border-slate-100 text-slate-600">
                    <span className="text-[11px] text-slate-500">مجموع درآمد خدمت:</span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      {formatToman(stat.totalRevenue)}
                    </span>
                  </div>
                </div>

                {/* Drilldown button */}
                <button
                  onClick={() => {
                    setSelectedServiceStat(stat);
                    setModalSearch('');
                  }}
                  className="mt-4 w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-indigo-200/80 hover:border-transparent shadow-xs cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>مشاهده لیست مراجعین ({stat.uniquePatientsCount} بیمار)</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Drill-Down Modal: List of Patients for Selected Service */}
      {selectedServiceStat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-l from-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-white">
                      لیست مراجعین خدمت: {selectedServiceStat.serviceName}
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    بازه زمانی: {periodLabel} |{' '}
                    <strong className="text-amber-300 font-mono">
                      {selectedServiceStat.uniquePatientsCount} بیمار یکتا
                    </strong>{' '}
                    ({selectedServiceStat.totalProcedures} بار انجام شده)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedServiceStat(null)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search and Quick Stats */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="جستجوی نام بیمار، شماره تماس، پزشک..."
                  className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 w-full sm:w-auto justify-between sm:justify-end">
                <span>
                  مجموع درآمد این خدمت:{' '}
                  <strong className="font-mono text-emerald-700 font-bold">
                    {formatToman(selectedServiceStat.totalRevenue)}
                  </strong>
                </span>
                <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-lg font-bold">
                  {modalFilteredAdmissions.length} پرونده پذیرش
                </span>
              </div>
            </div>

            {/* Patients List Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {modalFilteredAdmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  بیماری با این مشخصات در این لیست یافت نشد.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {modalFilteredAdmissions.map((adm) => (
                    <div
                      key={adm.id}
                      className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition-all"
                    >
                      {/* Patient Info */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {adm.patientName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                              {adm.patientName}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              {adm.admissionNumber}
                            </span>
                            {adm.details.sessionNumber && (
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                                جلسه {adm.details.sessionNumber}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono">
                              📅 {adm.date}
                            </span>
                            <span>اپراتور/پزشک: {adm.operatorName}</span>
                            {adm.debtAmount > 0 && (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                بدهی: {formatToman(adm.debtAmount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Phone & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        {/* Call button */}
                        <a
                          href={`tel:${adm.patientPhone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                          title="تماس مستقیم با بیمار"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="font-mono">{adm.patientPhone}</span>
                        </a>

                        {/* Copy phone */}
                        <button
                          onClick={(e) => handleCopyPhone(adm.patientPhone, e)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                          title="کپی شماره تلفن"
                        >
                          {copiedPhone === adm.patientPhone ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Open Dossier */}
                        {onOpenPatientDossier && (
                          <button
                            onClick={() => {
                              setSelectedServiceStat(null);
                              onOpenPatientDossier(adm.patientId);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-medium transition-all cursor-pointer"
                            title="مشاهده پرونده کامل"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>پرونده</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedServiceStat(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
