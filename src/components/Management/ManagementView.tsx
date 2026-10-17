import React, { useState, useMemo, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Percent,
  TrendingUp,
  DollarSign,
  Users,
  Layers,
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  PieChart,
  Calendar,
  Filter,
  Check,
  X,
  Printer,
  CreditCard,
  Receipt,
  CalendarDays,
  BarChart3,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  ServiceDefinition,
  Operator,
  Admission,
  Shareholder,
  ClinicSettings,
  ServiceCategory,
  MainDepartmentId,
  getServiceMainDepartment
} from '../../types';
import {
  formatToman,
  formatPersianDateReadable,
  getTodayPersianDate,
  addDaysToPersianDate,
  parsePersianDate,
  buildPersianDate,
  getDaysInPersianMonth,
  PERSIAN_MONTHS
} from '../../utils/persianDate';
import { EditAdmissionModal } from '../Admission/EditAdmissionModal';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { PersianYearPicker } from '../Common/PersianYearPicker';
import { ServicePatientAnalytics } from './ServicePatientAnalytics';
import { ReceivablesManager } from './ReceivablesManager';
import { AdminToolsPanel } from './AdminToolsPanel';
import { Patient } from '../../types';

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'laser_women', label: 'خدمات لیزر بانوان' },
  { value: 'laser_men', label: 'خدمات لیزر آقایان' },
  { value: 'botox', label: 'تزریق بوتاکس' },
  { value: 'filler', label: 'تزریق فیلر و ژل' },
  { value: 'mesogel', label: 'مزوژل جوانساز' },
  { value: 'mesotherapy', label: 'مزوتراپی و سابسیژن' },
  { value: 'prp', label: 'پی آر پی (PRP)' },
  { value: 'hifu', label: 'هایفوتراپی' },
  { value: 'surgery', label: 'جراحی‌های سرپایی و ساکشن' },
  { value: 'tattoo_face', label: 'لیزر کیوسوییچ (ریمو تتو)' },
  { value: 'carbon', label: 'کربن تراپی (پیلینگ هالیوودی)' },
  { value: 'mole', label: 'برداشت خال و اسکین تگ' },
  { value: 'white_hair', label: 'الکترولیز و برداشت موی سفید' },
  { value: 'piercing', label: 'پیرسینگ استریل' },
  { value: 'visit', label: 'ویزیت و مشاوره پزشک' },
  { value: 'laser', label: 'لیزر عمومی' },
  { value: 'tattoo_body', label: 'ریمو تتو بدن' },
  { value: 'plasma', label: 'پلاسما جت / پلکسر' },
  { value: 'custom', label: 'خدمت اختصاصی / سایر' },
];

interface ManagementViewProps {
  isUnlocked: boolean;
  onUnlockSuccess: () => void;
  onLockSession: () => void;
  settings: ClinicSettings;
  services: ServiceDefinition[];
  operators: Operator[];
  admissions: Admission[];
  shareholders: Shareholder[];
  consumablesList: { name: string; cost: number }[];
  onUpdateServices: (services: ServiceDefinition[]) => void;
  onUpdateOperators: (operators: Operator[]) => void;
  onUpdateShareholders: (shareholders: Shareholder[]) => void;
  onUpdateConsumables: (consumables: { name: string; cost: number }[]) => void;
  onPrintAdmission?: (admission: Admission) => void;
  onUpdateAdmission?: (updated: Admission) => void;
  patients?: Patient[];
  onOpenPatientDossier?: (patientId: string) => void;
  clinicData: any;
  onUpdateSettings: (settings: ClinicSettings) => void;
  onExportData: () => void;
  onImportData: (json: string) => boolean | Promise<boolean>;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  isUnlocked,
  onUnlockSuccess,
  onLockSession,
  settings,
  services,
  operators,
  admissions,
  shareholders,
  consumablesList,
  onUpdateServices,
  onUpdateOperators,
  onUpdateShareholders,
  onUpdateConsumables,
  onPrintAdmission,
  onUpdateAdmission,
  patients = [],
  onOpenPatientDossier,
  clinicData,
  onUpdateSettings,
  onExportData,
  onImportData,
  onToast,
}) => {
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null);
  // PIN Verification State
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Handle PIN verification
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (pinInput.trim() === settings.adminPin) {
      onUnlockSuccess();
      setPinInput('');
      setPinError('');
      setFailedAttempts(0);
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      setPinError('رمز عبور وارد شده نادرست است.');
      if (attempts >= 4) {
        setIsLockedOut(true);
        setLockoutTimer(30);
        const interval = setInterval(() => {
          setLockoutTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsLockedOut(false);
              setFailedAttempts(0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  // Sub-tabs in Management
  type AdminTab =
    | 'financial'
    | 'service_analytics'
    | 'receivables'
    | 'lines'
    | 'services'
    | 'operators'
    | 'shareholders'
    | 'consumables'
    | 'admin_tools';
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('financial');

  // Count of active receivables (cheques + unpaid invoice debts)
  const activeReceivablesCount = useMemo(() => {
    return admissions.filter((a) => {
      if (a.status === 'cancelled') return false;
      const hasCheque = a.paymentMethod === 'cheque' || a.paymentMethods?.includes('cheque') || !!a.chequeDetails;
      if (hasCheque && a.chequeDetails) {
        return a.chequeDetails.status !== 'cleared';
      }
      return (a.debtAmount || 0) > 0;
    }).length;
  }, [admissions]);

  // Date Filtering Modes for Management (روزانه، ماهانه، سالانه، بازه انتخابی)
  const today = getTodayPersianDate();
  const todayParts = useMemo(() => {
    return parsePersianDate(today);
  }, [today]);

  const [dateFilterMode, setDateFilterMode] = useState<'daily' | 'monthly' | 'yearly' | 'custom_range'>('daily');
  const [selectedDayDate, setSelectedDayDate] = useState<string>(today);
  const [selectedMonth, setSelectedMonth] = useState<number>(todayParts.month);
  const [selectedYear, setSelectedYear] = useState<number>(todayParts.year);
  const [customStartDate, setCustomStartDate] = useState<string>(() => addDaysToPersianDate(today, -7));
  const [customEndDate, setCustomEndDate] = useState<string>(today);

  // Search filter for transactions in financial view
  const [financialTxSearch, setFinancialTxSearch] = useState<string>('');

  const currentDayParts = useMemo(() => parsePersianDate(selectedDayDate), [selectedDayDate]);
  const customStartParts = useMemo(() => parsePersianDate(customStartDate), [customStartDate]);
  const customEndParts = useMemo(() => parsePersianDate(customEndDate), [customEndDate]);

  const availableYears = useMemo(() => {
    const y = todayParts.year;
    return [y - 3, y - 2, y - 1, y, y + 1, y + 2];
  }, [todayParts.year]);

  // Filter admissions by active date filter mode
  const filteredAdmissions = useMemo(() => {
    if (dateFilterMode === 'daily') {
      return admissions.filter((a) => a.date === selectedDayDate);
    }
    if (dateFilterMode === 'monthly') {
      const monthPrefix = `${selectedYear}/${String(selectedMonth).padStart(2, '0')}`;
      return admissions.filter((a) => a.date.startsWith(monthPrefix));
    }
    if (dateFilterMode === 'yearly') {
      const yearPrefix = `${selectedYear}/`;
      return admissions.filter((a) => a.date.startsWith(yearPrefix));
    }
    if (dateFilterMode === 'custom_range') {
      const start = customStartDate || '0000/00/00';
      const end = customEndDate || '9999/99/99';
      return admissions.filter((a) => a.date >= start && a.date <= end);
    }
    return admissions;
  }, [admissions, dateFilterMode, selectedDayDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const activeRangeTitle = useMemo(() => {
    if (dateFilterMode === 'daily') {
      return `کارکرد روزانه: ${formatPersianDateReadable(selectedDayDate)} ${selectedDayDate === today ? '(امروز)' : ''}`;
    }
    if (dateFilterMode === 'monthly') {
      return `کارکرد ماهانه: ${PERSIAN_MONTHS[selectedMonth - 1]} ${selectedYear}`;
    }
    if (dateFilterMode === 'yearly') {
      return `کارکرد سالانه: کل سال مالی ${selectedYear}`;
    }
    return `بازه انتخابی: از ${formatPersianDateReadable(customStartDate)} تا ${formatPersianDateReadable(customEndDate)}`;
  }, [dateFilterMode, selectedDayDate, selectedMonth, selectedYear, customStartDate, customEndDate, today]);

  // Management Revenue Performance Chart Calculation
  const managementChartData = useMemo(() => {
    if (dateFilterMode === 'daily') {
      // 7 days leading to selectedDayDate
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDaysToPersianDate(selectedDayDate, -i);
        const dayAdmissions = admissions.filter((a) => a.date === d);
        const rev = dayAdmissions.reduce((sum, a) => sum + a.paidAmount, 0);
        const label = i === 0 ? (selectedDayDate === today ? 'امروز' : selectedDayDate.split('/')[2]) : i === 1 ? 'دیروز' : d.split('/')[2];
        days.push({ label, fullDate: d, amount: rev, count: dayAdmissions.length });
      }
      return days;
    } else if (dateFilterMode === 'monthly') {
      // 4 weeks of the month
      const mStr = String(selectedMonth).padStart(2, '0');
      const weeks = [
        { label: 'هفته اول (۱-۷)', range: [1, 7] },
        { label: 'هفته دوم (۸-۱۴)', range: [8, 14] },
        { label: 'هفته سوم (۱۵-۲۱)', range: [15, 21] },
        { label: 'هفته چهارم و پنجم (۲۲-۳۱)', range: [22, 31] },
      ];
      return weeks.map((w) => {
        const weekAdmissions = admissions.filter((a) => {
          if (!a.date.startsWith(`${selectedYear}/${mStr}`)) return false;
          const dayNum = parseInt(a.date.split('/')[2], 10);
          return dayNum >= w.range[0] && dayNum <= w.range[1];
        });
        const rev = weekAdmissions.reduce((s, a) => s + a.paidAmount, 0);
        return { label: w.label, amount: rev, count: weekAdmissions.length };
      });
    } else if (dateFilterMode === 'yearly') {
      // 12 months of the year
      return PERSIAN_MONTHS.map((mName, idx) => {
        const mStr = String(idx + 1).padStart(2, '0');
        const prefix = `${selectedYear}/${mStr}`;
        const monthAdmissions = admissions.filter((a) => a.date.startsWith(prefix));
        const rev = monthAdmissions.reduce((s, a) => s + a.paidAmount, 0);
        return { label: mName, amount: rev, count: monthAdmissions.length };
      });
    } else {
      // custom_range: breakdown by unique dates in range
      const uniqueDates = Array.from(new Set(filteredAdmissions.map((a) => a.date))).sort();
      if (uniqueDates.length === 0) {
        return [{ label: 'فاقد تراکنش', amount: 0, count: 0 }];
      }
      return uniqueDates.map((d) => {
        const dayAdm = filteredAdmissions.filter((a) => a.date === d);
        const rev = dayAdm.reduce((s, a) => s + a.paidAmount, 0);
        return {
          label: d.split('/')[1] + '/' + d.split('/')[2],
          fullDate: d,
          amount: rev,
          count: dayAdm.length,
        };
      });
    }
  }, [dateFilterMode, selectedDayDate, selectedMonth, selectedYear, customStartDate, customEndDate, admissions, filteredAdmissions, today]);

  const maxManagementChartAmount = useMemo(() => {
    const max = Math.max(...managementChartData.map((d) => d.amount), 1);
    return max * 1.15;
  }, [managementChartData]);

  // Operator performance computation
  const operatorStats = useMemo(() => {
    return operators.map((op) => {
      const opAdmissions = filteredAdmissions.filter((a) => a.operatorId === op.id);
      const totalServiceValue = opAdmissions.reduce((sum, a) => sum + a.finalAmount, 0);
      const totalCollected = opAdmissions.reduce((sum, a) => sum + a.paidAmount, 0);
      const commissionAmount = Math.round((totalServiceValue * op.commissionRate) / 100);

      // Unique patients
      const patientIds = new Set(opAdmissions.map((a) => a.patientId));

      return {
        operator: op,
        serviceCount: opAdmissions.length,
        patientCount: patientIds.size,
        totalServiceValue,
        totalCollected,
        commissionAmount,
      };
    });
  }, [operators, filteredAdmissions]);

  // Service Lines performance computation
  const lineStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalAmount: number }> = {};

    filteredAdmissions.forEach((a) => {
      const cat = a.serviceCategory || 'other';
      if (!map[cat]) {
        map[cat] = {
          name: a.serviceName,
          count: 0,
          totalAmount: 0,
        };
      }
      map[cat].count += 1;
      map[cat].totalAmount += a.finalAmount;
    });

    const totalLinesRevenue = Object.values(map).reduce((sum, item) => sum + item.totalAmount, 0);

    return Object.entries(map).map(([cat, val]) => ({
      category: cat,
      name: val.name,
      count: val.count,
      totalAmount: val.totalAmount,
      percentage: totalLinesRevenue > 0 ? Math.round((val.totalAmount / totalLinesRevenue) * 100) : 0,
    }));
  }, [filteredAdmissions]);

  // Financial totals
  const financialTotals = useMemo(() => {
    const grossTotal = filteredAdmissions.reduce((sum, a) => sum + (a.basePrice * a.quantity), 0);
    const totalDiscounts = filteredAdmissions.reduce((sum, a) => sum + a.discount, 0);
    const totalFinalAmount = filteredAdmissions.reduce((sum, a) => sum + a.finalAmount, 0);
    const totalPaid = filteredAdmissions.reduce((sum, a) => sum + a.paidAmount, 0);
    const totalDebt = filteredAdmissions.reduce((sum, a) => sum + (a.debtAmount || 0), 0);

    // By payment method
    const posTotal = filteredAdmissions.filter((a) => a.paymentMethod === 'pos').reduce((s, a) => s + a.paidAmount, 0);
    const cardTotal = filteredAdmissions.filter((a) => a.paymentMethod === 'card_to_card').reduce((s, a) => s + a.paidAmount, 0);
    const cashTotal = filteredAdmissions.filter((a) => a.paymentMethod === 'cash').reduce((s, a) => s + a.paidAmount, 0);
    const chequeTotal = filteredAdmissions.filter((a) => a.paymentMethod === 'cheque').reduce((s, a) => s + a.paidAmount, 0);

    // By the 3 main clinic departments (۱. خدمات زیبایی  ۲. خدمات لیزر بانوان  ۳. خدمات لیزر آقایان)
    const beautyAdmissions = filteredAdmissions.filter(
      (a) => a.serviceCategory !== 'laser_women' && a.serviceCategory !== 'laser_men'
    );
    const laserWomenAdmissions = filteredAdmissions.filter((a) => a.serviceCategory === 'laser_women');
    const laserMenAdmissions = filteredAdmissions.filter((a) => a.serviceCategory === 'laser_men');

    const beautyRevenue = beautyAdmissions.reduce((s, a) => s + a.paidAmount, 0);
    const laserWomenRevenue = laserWomenAdmissions.reduce((s, a) => s + a.paidAmount, 0);
    const laserMenRevenue = laserMenAdmissions.reduce((s, a) => s + a.paidAmount, 0);

    return {
      grossTotal,
      totalDiscounts,
      totalFinalAmount,
      totalPaid,
      totalDebt,
      posTotal,
      cardTotal,
      cashTotal,
      chequeTotal,
      beautyRevenue,
      beautyCount: beautyAdmissions.length,
      laserWomenRevenue,
      laserWomenCount: laserWomenAdmissions.length,
      laserMenRevenue,
      laserMenCount: laserMenAdmissions.length,
    };
  }, [filteredAdmissions]);

  // Filtered transactions for financial transactions table
  const displayedFinancialAdmissions = useMemo(() => {
    if (!financialTxSearch.trim()) return filteredAdmissions;
    const q = financialTxSearch.trim().toLowerCase();
    return filteredAdmissions.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientPhone.includes(q) ||
        a.serviceName.toLowerCase().includes(q) ||
        a.operatorName.toLowerCase().includes(q)
    );
  }, [filteredAdmissions, financialTxSearch]);

  // Shareholders profit calculation
  const shareholdersReport = useMemo(() => {
    const totalRevenue = financialTotals.totalPaid;
    const totalOperatorCommissions = operatorStats.reduce((sum, s) => sum + s.commissionAmount, 0);
    const estimatedConsumablesCost = filteredAdmissions.reduce((sum, a) => {
      const cCost = a.consumables?.reduce((cs, c) => cs + c.cost, 0) || 0;
      return sum + cCost;
    }, 0);

    const netClinicProfit = Math.max(0, totalRevenue - totalOperatorCommissions - estimatedConsumablesCost);

    const shareholderShares = shareholders.map((sh) => {
      const amount = Math.round((netClinicProfit * sh.sharePercentage) / 100);
      return {
        ...sh,
        calculatedAmount: amount,
      };
    });

    return {
      totalRevenue,
      totalOperatorCommissions,
      estimatedConsumablesCost,
      netClinicProfit,
      shareholderShares,
    };
  }, [financialTotals, operatorStats, filteredAdmissions, shareholders]);

  // 3 Departments for Services Management (۱. خدمات زیبایی  ۲. خدمات لیزر بانوان  ۳. خدمات لیزر آقایان)
  const [adminServiceDept, setAdminServiceDept] = useState<MainDepartmentId>('beauty');
  const [adminServiceSearch, setAdminServiceSearch] = useState('');

  const adminBeautyCount = useMemo(
    () => services.filter((s) => getServiceMainDepartment(s.category) === 'beauty').length,
    [services]
  );
  const adminLaserWomenCount = useMemo(
    () => services.filter((s) => s.category === 'laser_women').length,
    [services]
  );
  const adminLaserMenCount = useMemo(
    () => services.filter((s) => s.category === 'laser_men').length,
    [services]
  );

  const adminFilteredServices = useMemo(() => {
    return services.filter((srv) => {
      // Must match selected department
      if (getServiceMainDepartment(srv.category) !== adminServiceDept) return false;

      // Match search query
      if (adminServiceSearch.trim()) {
        const q = adminServiceSearch.trim().toLowerCase();
        return srv.name.toLowerCase().includes(q) || srv.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [services, adminServiceDept, adminServiceSearch]);

  // Add Service State
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceCategory>('botox');
  const [newServicePrice, setNewServicePrice] = useState<number>(10000000);
  const [newServiceFollowUpDays, setNewServiceFollowUpDays] = useState<number>(30);
  const [newServiceFollowUpNote, setNewServiceFollowUpNote] = useState('جلسه بعدی');
  const [newServiceSessions, setNewServiceSessions] = useState<number | undefined>(undefined);

  // Edit Service State
  const [editingService, setEditingService] = useState<ServiceDefinition | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceCategory, setEditServiceCategory] = useState<ServiceCategory>('custom');
  const [editServicePrice, setEditServicePrice] = useState<number>(0);
  const [editServiceFollowUpDays, setEditServiceFollowUpDays] = useState<number>(30);
  const [editServiceFollowUpNote, setEditServiceFollowUpNote] = useState('');
  const [editServiceSessions, setEditServiceSessions] = useState<number | undefined>(undefined);
  const [editServiceActive, setEditServiceActive] = useState<boolean>(true);
  const [isDeletingServiceConfirm, setIsDeletingServiceConfirm] = useState(false);
  const [serviceFeedbackMsg, setServiceFeedbackMsg] = useState<string | null>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingService) {
        setEditingService(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingService]);

  const handleStartEditService = (srv: ServiceDefinition) => {
    setEditingService(srv);
    setEditServiceName(srv.name);
    setEditServiceCategory(srv.category);
    setEditServicePrice(srv.defaultPrice);
    setEditServiceFollowUpDays(srv.followUpDaysDefault);
    setEditServiceFollowUpNote(srv.followUpNoteDefault || '');
    setEditServiceSessions(srv.defaultSessions);
    setEditServiceActive(srv.active);
    setIsDeletingServiceConfirm(false);
  };

  const handleSaveEditService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    if (!editServiceName.trim()) return;

    const updated = services.map((s) => {
      if (s.id === editingService.id) {
        return {
          ...s,
          name: editServiceName.trim(),
          category: editServiceCategory,
          defaultPrice: Math.max(0, editServicePrice),
          followUpDaysDefault: Math.max(0, editServiceFollowUpDays),
          followUpNoteDefault: editServiceFollowUpNote.trim(),
          defaultSessions: editServiceSessions ? Math.max(1, editServiceSessions) : undefined,
          active: editServiceActive,
        };
      }
      return s;
    });

    onUpdateServices(updated);
    const savedName = editServiceName.trim();
    setEditingService(null);
    setServiceFeedbackMsg(`اطلاعات خدمت «${savedName}» با موفقیت ویرایش و ذخیره شد.`);
    setTimeout(() => setServiceFeedbackMsg(null), 3500);
  };

  const handleDeleteService = () => {
    if (!editingService) return;
    const srvName = editingService.name;
    const updated = services.filter((s) => s.id !== editingService.id);
    onUpdateServices(updated);
    setEditingService(null);
    setIsDeletingServiceConfirm(false);
    setServiceFeedbackMsg(`خدمت «${srvName}» با موفقیت حذف شد.`);
    setTimeout(() => setServiceFeedbackMsg(null), 3500);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const newSrv: ServiceDefinition = {
      id: `srv-${Date.now()}`,
      name: newServiceName.trim(),
      category: newServiceCategory,
      defaultPrice: Math.max(0, newServicePrice),
      followUpDaysDefault: Math.max(0, newServiceFollowUpDays),
      followUpNoteDefault: newServiceFollowUpNote.trim(),
      defaultSessions: newServiceSessions ? Math.max(1, newServiceSessions) : undefined,
      active: true,
    };

    onUpdateServices([...services, newSrv]);
    setIsAddingService(false);
    setNewServiceName('');
    setServiceFeedbackMsg(`خدمت جدید «${newSrv.name}» با موفقیت اضافه شد.`);
    setTimeout(() => setServiceFeedbackMsg(null), 3500);
  };

  // Add Operator State
  const [isAddingOperator, setIsAddingOperator] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newOpRole, setNewOpRole] = useState<'doctor' | 'operator' | 'technician'>('doctor');
  const [newOpCommission, setNewOpCommission] = useState<number>(30);
  const [newOpPhone, setNewOpPhone] = useState('');

  // Edit Operator State (ویرایش کامل اپراتور / پزشک)
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [editOpName, setEditOpName] = useState('');
  const [editOpRole, setEditOpRole] = useState<'doctor' | 'operator' | 'technician'>('doctor');
  const [editOpCommission, setEditOpCommission] = useState<number>(30);
  const [editOpPhone, setEditOpPhone] = useState('');
  const [editOpActive, setEditOpActive] = useState<boolean>(true);
  const [isDeletingOpConfirm, setIsDeletingOpConfirm] = useState(false);
  const [operatorFeedbackMsg, setOperatorFeedbackMsg] = useState<string | null>(null);

  // Close operator edit modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingOperator) {
        setEditingOperator(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingOperator]);

  const handleStartEditOperator = (op: Operator) => {
    setEditingOperator(op);
    setEditOpName(op.name);
    setEditOpRole(op.role);
    setEditOpCommission(op.commissionRate);
    setEditOpPhone(op.phone || '');
    setEditOpActive(op.active !== false);
    setIsDeletingOpConfirm(false);
  };

  const handleSaveEditOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOperator) return;
    if (!editOpName.trim()) return;

    const updated = operators.map((o) => {
      if (o.id === editingOperator.id) {
        return {
          ...o,
          name: editOpName.trim(),
          role: editOpRole,
          commissionRate: Math.min(100, Math.max(0, editOpCommission)),
          phone: editOpPhone.trim(),
          active: editOpActive,
        };
      }
      return o;
    });

    onUpdateOperators(updated);
    const savedName = editOpName.trim();
    setEditingOperator(null);
    setOperatorFeedbackMsg(`مشخصات اپراتور «${savedName}» با موفقیت ویرایش و ذخیره شد.`);
    setTimeout(() => setOperatorFeedbackMsg(null), 3500);
  };

  const handleDeleteOperator = () => {
    if (!editingOperator) return;
    const opName = editingOperator.name;
    const updated = operators.filter((o) => o.id !== editingOperator.id);
    onUpdateOperators(updated);
    setEditingOperator(null);
    setIsDeletingOpConfirm(false);
    setOperatorFeedbackMsg(`اپراتور «${opName}» با موفقیت حذف شد.`);
    setTimeout(() => setOperatorFeedbackMsg(null), 3500);
  };

  const handleAddOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpName.trim()) return;

    const newOp: Operator = {
      id: `op-${Date.now()}`,
      name: newOpName.trim(),
      role: newOpRole,
      commissionRate: newOpCommission,
      phone: newOpPhone.trim(),
      active: true,
    };

    onUpdateOperators([...operators, newOp]);
    setIsAddingOperator(false);
    setNewOpName('');
    setOperatorFeedbackMsg(`اپراتور جدید «${newOp.name}» با موفقیت افزوده شد.`);
    setTimeout(() => setOperatorFeedbackMsg(null), 3500);
  };

  // Add Shareholder State
  const [isAddingShareholder, setIsAddingShareholder] = useState(false);
  const [newShName, setNewShName] = useState('');
  const [newShPercent, setNewShPercent] = useState<number>(50);

  const handleAddShareholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShName.trim()) return;

    const newSh: Shareholder = {
      id: `sh-${Date.now()}`,
      name: newShName.trim(),
      sharePercentage: newShPercent,
    };

    onUpdateShareholders([...shareholders, newSh]);
    setIsAddingShareholder(false);
    setNewShName('');
  };

  // Add Consumable Item
  const [isAddingConsumable, setIsAddingConsumable] = useState(false);
  const [newConsumableName, setNewConsumableName] = useState('');
  const [newConsumableCost, setNewConsumableCost] = useState<number>(20000);

  const handleAddConsumable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsumableName.trim()) return;
    onUpdateConsumables([...consumablesList, { name: newConsumableName.trim(), cost: newConsumableCost }]);
    setIsAddingConsumable(false);
    setNewConsumableName('');
  };

  // If locked, render PIN Gate Screen
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-sky-600">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h3 className="font-bold text-slate-900 text-lg">ورود امن به پنل مدیریت مطب</h3>
          <p className="text-xs text-slate-500 mt-1">
            این بخش به دلیل دارا بودن گزارش‌های مالی و تعرفه‌ها نیازمند تایید هویت مدیر مطب می‌باشد.
          </p>
        </div>

        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={10}
              autoFocus
              value={pinInput}
              disabled={isLockedOut}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="رمز عبور مدیریت را وارد فرمایید..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono text-base tracking-widest focus:bg-white focus:border-sky-500 focus:outline-none"
            />
            {pinError && <p className="text-xs text-rose-600 mt-2 font-medium">{pinError}</p>}
            {isLockedOut && (
              <p className="text-xs text-rose-600 mt-2 font-bold">
                به دلیل تلاش‌های ناموفق مکرر، ورود تا {lockoutTimer} ثانیه مسدود شد.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLockedOut || !pinInput}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-colors ${
              !isLockedOut && pinInput
                ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            تایید و ورود به مدیریت
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
          <span>رمز پیش‌فرض سیستم: </span>
          <span className="font-mono tabular-nums font-bold text-slate-600">1234</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner with Lock Session & Clinic Info */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-bold text-slate-900 text-sm">پنل مدیریت مطب و محاسبات مالی محرمانه</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            گزارش‌های درآمد وصولی، کارکرد اپراتورها، سهم سهامداران و ویرایش خدمات مطب
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLockSession}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>خروج و قفل کردن پنل</span>
          </button>
        </div>
      </div>

      {/* Date Filter Controller Card (روزانه، ماهانه، سالانه، بازه انتخابی) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                تنظیم بازه زمانی گزارش‌های کارکرد و درآمد وصولی
              </h4>
              <p className="text-[11px] text-slate-500">
                مشاهده کارکرد روزانه (با انتخاب تاریخ)، ماهانه، سالانه یا بازه انتخابی (از تاریخ چند تا چند)
              </p>
            </div>
          </div>

          {/* 4 Mode Buttons */}
          <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDateFilterMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilterMode === 'daily'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>روزانه (تاریخ مشخص)</span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilterMode === 'monthly'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>ماهانه (انتخاب ماه)</span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('yearly')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilterMode === 'yearly'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>سالانه (انتخاب سال)</span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('custom_range')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilterMode === 'custom_range'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>بازه انتخابی (از تاریخ چند تا چند)</span>
            </button>
          </div>
        </div>

        {/* Active Mode Inputs Row */}
        <div className="pt-1 space-y-3">
          {/* 1. DAILY MODE (روزانه بتوان تاریخ زد) */}
          {dateFilterMode === 'daily' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Direct Text Input */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                    تایپ تاریخ دلخواه:
                  </label>
                  <input
                    type="text"
                    value={selectedDayDate}
                    onChange={(e) => setSelectedDayDate(e.target.value)}
                    placeholder="مثال: ۱۴۰۳/۰۷/۲۱"
                    className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono tabular-nums text-center focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Persian Date Picker Component */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-xl text-xs">
                  <span className="text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                    یا انتخاب از تقویم:
                  </span>
                  <div className="w-40 sm:w-44">
                    <PersianDatePicker
                      value={selectedDayDate}
                      onChange={(newDate) => {
                        if (newDate) setSelectedDayDate(newDate);
                      }}
                      presets={[]}
                      placeholder="انتخاب از تقویم..."
                    />
                  </div>
                </div>

                {/* Day Navigation Shortcuts */}
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDayDate(addDaysToPersianDate(selectedDayDate, -1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                    title="یک روز قبل‌تر"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>روز قبل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDayDate(today)}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium text-[11px] ${
                      selectedDayDate === today
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    امروز
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDayDate(addDaysToPersianDate(today, -1))}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium text-[11px] ${
                      selectedDayDate === addDaysToPersianDate(today, -1)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    دیروز
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDayDate(addDaysToPersianDate(today, -2))}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium text-[11px] ${
                      selectedDayDate === addDaysToPersianDate(today, -2)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    پریروز
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDayDate(addDaysToPersianDate(selectedDayDate, 1))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                    title="یک روز بعدتر"
                  >
                    <span>روز بعد</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Day Ribbon Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>کارکرد روز:</span>
                  <span className="font-bold underline">{formatPersianDateReadable(selectedDayDate)}</span>
                  {selectedDayDate === today && (
                    <span className="px-1.5 py-0.5 bg-emerald-200/80 text-emerald-800 text-[10px] rounded-md font-bold">
                      (امروز)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    تعداد پذیرش: <strong className="font-mono text-slate-900">{filteredAdmissions.length}</strong>
                  </span>
                  <span className="text-emerald-800 font-bold font-mono tabular-nums">
                    وصولی روز: {formatToman(financialTotals.totalPaid)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. MONTHLY MODE (ماهانه بتوان ماه انتخاب کرد) */}
          {dateFilterMode === 'monthly' && (
            <div className="space-y-3">
              {/* Year Selector with PersianYearPicker & Quick Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    سال مالی مورد نظر:
                  </span>
                  <PersianYearPicker
                    value={selectedYear}
                    onChange={(y) => setSelectedYear(y)}
                    placeholder="انتخاب سال..."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth(todayParts.month);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      selectedMonth === todayParts.month
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    ماه جاری ({PERSIAN_MONTHS[todayParts.month - 1]} {selectedYear})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedYear !== todayParts.year) {
                        setSelectedYear(todayParts.year);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      selectedYear === todayParts.year
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                    title={selectedYear !== todayParts.year ? `کلیک برای بازگشت به سال ${todayParts.year}` : undefined}
                  >
                    سال جاری ({selectedYear})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMonth === 1) {
                        setSelectedYear((prev) => prev - 1);
                        setSelectedMonth(12);
                      } else {
                        setSelectedMonth((prev) => prev - 1);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    ماه گذشته
                  </button>

                  {selectedYear !== todayParts.year && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYear(todayParts.year);
                        setSelectedMonth(todayParts.month);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium cursor-pointer transition-colors"
                      title="بازگشت به تقویم امروز"
                    >
                      بازگشت به سال {todayParts.year}
                    </button>
                  )}
                </div>
              </div>

              {/* 12 Months Visual Grid (انتخاب مستقیم ماه) */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-2">
                  برای مشاهده درآمد و کارکرد، یکی از ۱۲ ماه زیر را انتخاب کنید:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {PERSIAN_MONTHS.map((mName, idx) => {
                    const monthNum = idx + 1;
                    const isSelected = selectedMonth === monthNum;
                    const isCurrentMonthOfToday =
                      todayParts.year === selectedYear && todayParts.month === monthNum;

                    return (
                      <button
                        key={monthNum}
                        type="button"
                        onClick={() => setSelectedMonth(monthNum)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                            : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold">{mName}</span>
                        {isCurrentMonthOfToday && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            ماه جاری
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Month Ribbon Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>کارکرد کل ماه:</span>
                  <strong className="text-sm underline">
                    {PERSIAN_MONTHS[selectedMonth - 1]} {selectedYear}
                  </strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    تعداد پذیرش ماه: <strong className="font-mono text-slate-900">{filteredAdmissions.length}</strong>
                  </span>
                  <span className="text-emerald-800 font-bold font-mono tabular-nums">
                    وصولی ماه: {formatToman(financialTotals.totalPaid)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. YEARLY MODE (سالانه بتوان سال انتخاب کرد) */}
          {dateFilterMode === 'yearly' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    انتخاب سال مالی کلینیک:
                  </span>
                  <PersianYearPicker
                    value={selectedYear}
                    onChange={(y) => setSelectedYear(y)}
                    placeholder="انتخاب سال مالی..."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-all bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold"
                  >
                    سال جاری ({selectedYear})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedYear((prev) => prev - 1)}
                    className="px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-all bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    سال گذشته ({selectedYear - 1})
                  </button>
                  {selectedYear !== todayParts.year && (
                    <button
                      type="button"
                      onClick={() => setSelectedYear(todayParts.year)}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium cursor-pointer transition-colors"
                      title="بازگشت به سال تقویمی امروز"
                    >
                      بازگشت به سال {todayParts.year}
                    </button>
                  )}
                </div>
              </div>

              {/* Year Ribbon Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>کارکرد سال مالی:</span>
                  <strong className="text-sm underline">کل سال {selectedYear} (۱۲ ماه)</strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    تعداد کل پذیرش‌ها: <strong className="font-mono text-slate-900">{filteredAdmissions.length}</strong>
                  </span>
                  <span className="text-emerald-800 font-bold font-mono tabular-nums">
                    وصولی سال: {formatToman(financialTotals.totalPaid)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. CUSTOM RANGE MODE (یک گزینه انتخابی که بتوان مشخص کرد از تاریخ چند تا چند) */}
          {dateFilterMode === 'custom_range' && (
            <div className="space-y-3">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-4">
                  {/* From Date */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">
                      از تاریخ (شروع بازه):
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-40 sm:w-44">
                        <PersianDatePicker
                          value={customStartDate}
                          onChange={(newDate) => {
                            if (newDate) setCustomStartDate(newDate);
                          }}
                          presets={[]}
                          placeholder="انتخاب تاریخ شروع..."
                        />
                      </div>
                      <input
                        type="text"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        placeholder="مثال: ۱۴۰۳/۰۷/۰۱"
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono tabular-nums text-center focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        title="تایپ مستقیم تاریخ شروع"
                      />
                    </div>
                  </div>

                  <span className="text-slate-300 font-bold hidden sm:inline">←</span>

                  {/* To Date */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">
                      تا تاریخ (پایان بازه):
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-40 sm:w-44">
                        <PersianDatePicker
                          value={customEndDate}
                          onChange={(newDate) => {
                            if (newDate) setCustomEndDate(newDate);
                          }}
                          presets={[]}
                          placeholder="انتخاب تاریخ پایان..."
                        />
                      </div>
                      <input
                        type="text"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        placeholder="مثال: ۱۴۰۳/۰۷/۲۱"
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono tabular-nums text-center focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        title="تایپ مستقیم تاریخ پایان"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Range Presets */}
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">میانبرهای بازه سریع:</span>
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate(addDaysToPersianDate(today, -7));
                        setCustomEndDate(today);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer text-[11px]"
                    >
                      ۷ روز اخیر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate(addDaysToPersianDate(today, -15));
                        setCustomEndDate(today);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer text-[11px]"
                    >
                      ۱۵ روز اخیر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate(addDaysToPersianDate(today, -30));
                        setCustomEndDate(today);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer text-[11px]"
                    >
                      ۳۰ روز اخیر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const startOfMonth = `${today.split('/')[0]}/${today.split('/')[1]}/01`;
                        setCustomStartDate(startOfMonth);
                        setCustomEndDate(today);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer text-[11px]"
                    >
                      از اول ماه تا امروز
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const startOfYear = `${today.split('/')[0]}/01/01`;
                        setCustomStartDate(startOfYear);
                        setCustomEndDate(today);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer text-[11px]"
                    >
                      از اول سال تا امروز
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Range Ribbon Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>بازه زمانی انتخابی:</span>
                  <strong className="text-sm underline">
                    از {formatPersianDateReadable(customStartDate)} تا {formatPersianDateReadable(customEndDate)}
                  </strong>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    تعداد کل پذیرش‌ها: <strong className="font-mono text-slate-900">{filteredAdmissions.length}</strong>
                  </span>
                  <span className="text-emerald-800 font-bold font-mono tabular-nums">
                    مجموع وصولی دوره: {formatToman(financialTotals.totalPaid)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Highlight Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 p-3.5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-emerald-900 font-bold block">
                  مجموع درآمد وصولی مطب در این بازه ({filteredAdmissions.length} پذیرش ثبت‌شده):
                </span>
                <span className="text-[11px] text-emerald-700">
                  {activeRangeTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums font-bold text-emerald-950 text-xl md:text-2xl">
                {formatToman(financialTotals.totalPaid)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs (درآمد وصولی و کارکرد مطب به عنوان تب اول و پیش‌فرض) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs">
        {[
          { id: 'financial' as AdminTab, label: '💰 درآمد وصولی و کارکرد مطب' },
          { id: 'service_analytics' as AdminTab, label: '👥 آمار بیماران و خدمات' },
          {
            id: 'receivables' as AdminTab,
            label: '📞 طلبکاری‌ها و چک‌ها',
            badge: activeReceivablesCount > 0 ? activeReceivablesCount : undefined,
            badgeColor: 'bg-rose-600 text-white',
          },
          { id: 'lines' as AdminTab, label: 'عملکرد لاین‌های درمانی' },
          { id: 'services' as AdminTab, label: 'تعرفه و ویرایش خدمات' },
          { id: 'operators' as AdminTab, label: 'مدیریت و کارکرد اپراتورها' },
          { id: 'shareholders' as AdminTab, label: 'محاسبه سهم سهامداران' },
          { id: 'consumables' as AdminTab, label: 'مدیریت مواد مصرفی' },
          { id: 'admin_tools' as AdminTab, label: '🔐 امنیت، پشتیبان و دیتابیس' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === tab.id
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor || 'bg-slate-200'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Service & Patient Volume Analytics */}
      {activeAdminTab === 'service_analytics' && (
        <ServicePatientAnalytics
          admissions={admissions}
          patients={patients}
          onOpenPatientDossier={onOpenPatientDossier}
          onPrintAdmission={onPrintAdmission}
        />
      )}

      {/* Tab: Receivables & Cheques Manager */}
      {activeAdminTab === 'receivables' && (
        <ReceivablesManager
          admissions={admissions}
          patients={patients}
          onUpdateAdmission={onUpdateAdmission}
          onOpenPatientDossier={onOpenPatientDossier}
        />
      )}

      {/* Tab 1: Service Definitions & Pricing */}
      {activeAdminTab === 'services' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          {/* Feedback banner */}
          {serviceFeedbackMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{serviceFeedbackMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">لیست تعرفه خدمات مطب</h4>
              <p className="text-xs text-slate-500">
                تعیین تعرفه مصوب، دسته‌بندی درمانی، فاصله پیش‌فرض مراجعه بعدی و وضعیت فعال بودن هر خدمت
              </p>
            </div>
            <button
              onClick={() => setIsAddingService(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ افزودن خدمت جدید</span>
            </button>
          </div>

          {/* New Service Modal/Form */}
          {isAddingService && (
            <form onSubmit={handleAddService} className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 space-y-3 text-xs">
              <span className="font-bold text-sky-900 block">مشخصات خدمت جدید:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">عنوان خدمت:</label>
                  <input
                    type="text"
                    required
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="مثلاً: بلفاروپلاستی پلک"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">دسته‌بندی درمانی:</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value as ServiceCategory)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  >
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">تعرفه پیش‌فرض (ریال):</label>
                  <input
                    type="number"
                    step="50000"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums text-left focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">تعداد جلسات دوره:</label>
                  <input
                    type="number"
                    min="1"
                    value={newServiceSessions ?? ''}
                    onChange={(e) =>
                      setNewServiceSessions(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    placeholder="مثلاً: ۶"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">فاصله مراجعه بعدی (روز):</label>
                  <input
                    type="number"
                    value={newServiceFollowUpDays}
                    onChange={(e) => setNewServiceFollowUpDays(parseInt(e.target.value, 10) || 30)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">متن پیش‌فرض یادآوری:</label>
                  <input
                    type="text"
                    value={newServiceFollowUpNote}
                    onChange={(e) => setNewServiceFollowUpNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingService(false)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-700"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium shadow-xs transition-colors"
                >
                  ذخیره خدمت
                </button>
              </div>
            </form>
          )}

          {/* 3 Main Department Tabs for Management */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex p-1 bg-slate-100 rounded-xl gap-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAdminServiceDept('beauty')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  adminServiceDept === 'beauty'
                    ? 'bg-white text-purple-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>۱. خدمات زیبایی</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70">
                  {adminBeautyCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAdminServiceDept('laser_women')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  adminServiceDept === 'laser_women'
                    ? 'bg-white text-rose-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>۲. خدمات لیزر بانوان</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70">
                  {adminLaserWomenCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAdminServiceDept('laser_men')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  adminServiceDept === 'laser_men'
                    ? 'bg-white text-sky-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>۳. خدمات لیزر آقایان</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70">
                  {adminLaserMenCount}
                </span>
              </button>
            </div>

            {/* Search Input in Management */}
            <div className="relative sm:w-64">
              <input
                type="text"
                value={adminServiceSearch}
                onChange={(e) => setAdminServiceSearch(e.target.value)}
                placeholder="جستجو در لیست خدمات این بخش..."
                className="w-full px-3 py-1.5 pl-8 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
              {adminServiceSearch && (
                <button
                  type="button"
                  onClick={() => setAdminServiceSearch('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Services Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-3 font-semibold">عنوان خدمت</th>
                  <th className="py-2.5 px-3 font-semibold">گروه درمانی</th>
                  <th className="py-2.5 px-3 font-semibold text-left">تعرفه مصوب</th>
                  <th className="py-2.5 px-3 font-semibold">فاصله پیگیری بعدی</th>
                  <th className="py-2.5 px-3 font-semibold text-center">وضعیت</th>
                  <th className="py-2.5 px-3 font-semibold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {adminFilteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      خدمتی در این دسته‌بندی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  adminFilteredServices.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900">{srv.name}</span>
                        {srv.defaultSessions && (
                          <span className="text-[11px] text-slate-400 mr-2">
                            ({srv.defaultSessions} جلسه)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {SERVICE_CATEGORIES.find((c) => c.value === srv.category)?.label || srv.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-left font-mono tabular-nums font-bold text-slate-800">
                        {formatToman(srv.defaultPrice)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                        {srv.followUpDaysDefault} روز بعد ({srv.followUpNoteDefault})
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            srv.active ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          {srv.active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleStartEditService(srv)}
                          className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors border border-sky-100 hover:border-sky-200"
                          title="ویرایش خدمات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>ویرایش خدمات</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Service Modal */}
          {editingService && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">ویرایش خدمات مطب</h3>
                      <p className="text-[11px] text-slate-500">
                        تنظیم مشخصات، تعرفه و شرایط پیگیری خدمت
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveEditService} className="p-5 space-y-4 overflow-y-auto text-xs">
                  {/* Service Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        عنوان خدمت <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={editServiceName}
                        onChange={(e) => setEditServiceName(e.target.value)}
                        placeholder="مثال: تزریق بوتاکس دیسپورت"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        دسته‌بندی درمانی:
                      </label>
                      <select
                        value={editServiceCategory}
                        onChange={(e) => setEditServiceCategory(e.target.value as ServiceCategory)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
                      >
                        {SERVICE_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price & Sessions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        تعرفه مصوب / قیمت پایه (ریال):
                      </label>
                      <input
                        type="number"
                        step="50000"
                        min="0"
                        value={editServicePrice}
                        onChange={(e) => setEditServicePrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs text-left"
                      />
                      <div className="text-[11px] text-sky-700 font-medium mt-1 font-mono text-left">
                        معادل: {formatToman(editServicePrice)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        تعداد جلسات دوره (پیش‌فرض):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editServiceSessions ?? ''}
                        onChange={(e) =>
                          setEditServiceSessions(e.target.value ? parseInt(e.target.value, 10) : undefined)
                        }
                        placeholder="مثلاً: ۶"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Follow Up Days & Follow Up Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        فاصله پیشنهادی پیگیری بعدی (روز):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editServiceFollowUpDays}
                        onChange={(e) => setEditServiceFollowUpDays(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        متن پیش‌فرض یادآوری پیگیری:
                      </label>
                      <input
                        type="text"
                        value={editServiceFollowUpNote}
                        onChange={(e) => setEditServiceFollowUpNote(e.target.value)}
                        placeholder="مثال: جلسه بعدی درمان"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Active Switch */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={editServiceActive}
                        onChange={(e) => setEditServiceActive(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          وضعیت: {editServiceActive ? 'فعال در سیستم' : 'غیرفعال'}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {editServiceActive
                            ? 'این خدمت در لیست خدمات پذیرش بیمار قابل انتخاب است.'
                            : 'این خدمت به طور موقت در فرم پذیرش پنهان می‌شود.'}
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Delete Confirmation Box */}
                  {isDeletingServiceConfirm && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                      <p className="text-xs text-rose-800 font-medium">
                        آیا از حذف کامل خدمت «{editingService.name}» اطمینان دارید؟ این عمل قابل بازگشت نیست.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDeleteService}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                        >
                          بله، حذف قطعی خدمت
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeletingServiceConfirm(false)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          انصراف از حذف
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      {!isDeletingServiceConfirm && (
                        <button
                          type="button"
                          onClick={() => setIsDeletingServiceConfirm(true)}
                          className="flex items-center gap-1 px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف این خدمت</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 rounded-xl font-medium hover:bg-slate-100 transition-colors"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>ذخیره تغییرات خدمت</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Operators Management & Commission */}
      {activeAdminTab === 'operators' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          {/* Feedback banner */}
          {operatorFeedbackMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{operatorFeedbackMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">مدیریت اپراتورها و محاسبه سهم کارکرد</h4>
              <p className="text-xs text-slate-500">
                بررسی عملکرد در بازه {activeRangeTitle}
              </p>
            </div>
            <button
              onClick={() => setIsAddingOperator(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ افزودن اپراتور جدید</span>
            </button>
          </div>

          {/* Add Operator Form */}
          {isAddingOperator && (
            <form onSubmit={handleAddOperator} className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 space-y-3 text-xs">
              <span className="font-bold text-sky-900 block">مشخصات اپراتور یا پزشک جدید:</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">نام و نام خانوادگی:</label>
                  <input
                    type="text"
                    required
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                    placeholder="مثال: دکتر احمدی"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">نقش:</label>
                  <select
                    value={newOpRole}
                    onChange={(e) => setNewOpRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer"
                  >
                    <option value="doctor">پزشک مطب</option>
                    <option value="operator">اپراتور زیبایی</option>
                    <option value="technician">تکنسین دستگاه</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">درصد سهم (٪):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newOpCommission}
                    onChange={(e) => setNewOpCommission(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">شماره تماس:</label>
                  <input
                    type="tel"
                    value={newOpPhone}
                    onChange={(e) => setNewOpPhone(e.target.value)}
                    placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingOperator(false)}
                  className="px-3 py-1.5 text-slate-500 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium cursor-pointer shadow-xs"
                >
                  ثبت اپراتور
                </button>
              </div>
            </form>
          )}

          {/* Performance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-3 font-semibold">نام اپراتور</th>
                  <th className="py-2.5 px-3 font-semibold">نقش</th>
                  <th className="py-2.5 px-3 font-semibold text-center">تعداد خدمات</th>
                  <th className="py-2.5 px-3 font-semibold text-center">بیماران</th>
                  <th className="py-2.5 px-3 font-semibold text-left">مبلغ کل کارکرد</th>
                  <th className="py-2.5 px-3 font-semibold text-center">درصد سهم</th>
                  <th className="py-2.5 px-3 font-semibold text-left">مبلغ سهم اپراتور</th>
                  <th className="py-2.5 px-3 font-semibold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {operatorStats.map((stat) => (
                  <tr key={stat.operator.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{stat.operator.name}</span>
                        {stat.operator.active === false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-medium">
                            غیرفعال
                          </span>
                        )}
                      </div>
                      {stat.operator.phone && (
                        <span className="block text-[11px] text-slate-400 font-mono tabular-nums">
                          {stat.operator.phone}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {stat.operator.role === 'doctor'
                        ? 'پزشک مطب'
                        : stat.operator.role === 'technician'
                        ? 'تکنسین دستگاه'
                        : 'اپراتور زیبایی'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums">
                      {stat.serviceCount}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums">
                      {stat.patientCount}
                    </td>
                    <td className="py-3 px-3 text-left font-mono tabular-nums">
                      {formatToman(stat.totalServiceValue)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-sky-700">
                      {stat.operator.commissionRate}٪
                    </td>
                    <td className="py-3 px-3 text-left font-mono tabular-nums font-bold text-emerald-700">
                      {formatToman(stat.commissionAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleStartEditOperator(stat.operator)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/90 rounded-xl font-semibold transition-all cursor-pointer shadow-2xs group"
                        title={`ویرایش کامل مشخصات ${stat.operator.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
                        <span>ویرایش</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Operator Modal (ویرایش کامل اپراتور) */}
          {editingOperator && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Edit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">ویرایش کامل مشخصات اپراتور / پزشک</h3>
                      <p className="text-[11px] text-slate-500">
                        تنظیم نام، نقش سازمانی، درصد سهم کارکرد، شماره تماس و وضعیت فعالیت
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingOperator(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveEditOperator} className="p-5 space-y-4 overflow-y-auto text-xs">
                  {/* Name & Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        نام و نام خانوادگی <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        value={editOpName}
                        onChange={(e) => setEditOpName(e.target.value)}
                        placeholder="مثال: دکتر حسن محمدی"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        نقش سازمانی:
                      </label>
                      <select
                        value={editOpRole}
                        onChange={(e) => setEditOpRole(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs cursor-pointer"
                      >
                        <option value="doctor">پزشک مطب</option>
                        <option value="operator">اپراتور زیبایی</option>
                        <option value="technician">تکنسین دستگاه</option>
                      </select>
                    </div>
                  </div>

                  {/* Commission & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        درصد سهم از کارکرد (٪):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          required
                          value={editOpCommission}
                          onChange={(e) => setEditOpCommission(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs font-mono tabular-nums text-left"
                        />
                        <span className="absolute left-3 top-2 text-slate-400 font-bold">٪</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        درصد سهم بر اساس تعرفه خدمات محاسبه خواهد شد
                      </p>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        شماره تماس / موبایل:
                      </label>
                      <input
                        type="tel"
                        value={editOpPhone}
                        onChange={(e) => setEditOpPhone(e.target.value)}
                        placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">وضعیت همکاری و فعالیت:</span>
                      <p className="text-[11px] text-slate-500">
                        در صورت فعال بودن، در منوی انتخاب اپراتور بخش پذیرش نمایش داده می‌شود
                      </p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={editOpActive}
                        onChange={(e) => setEditOpActive(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {/* Delete Confirmation Box */}
                  {isDeletingOpConfirm ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>آیا از حذف اپراتور «{editingOperator.name}» مطمئن هستید؟</span>
                      </div>
                      <p className="text-[11px] text-rose-600 leading-relaxed">
                        تراکنش‌ها و کارکردهای پیشین این اپراتور در آرشیو مالی مطب محفوظ می‌ماند، اما این اپراتور از لیست پرسنل فعال کلینیک حذف خواهد شد.
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsDeletingOpConfirm(false)}
                          className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs cursor-pointer font-medium"
                        >
                          انصراف
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteOperator}
                          className="px-3.5 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold text-xs shadow-xs cursor-pointer"
                        >
                          بله، حذف کن
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    {!isDeletingOpConfirm ? (
                      <button
                        type="button"
                        onClick={() => setIsDeletingOpConfirm(true)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف اپراتور</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingOperator(null)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium text-xs cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ذخیره تغییرات</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Service Lines Performance */}
      {activeAdminTab === 'lines' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">عملکرد و درآمد لاین‌های درمانی مختلف</h4>
            <p className="text-xs text-slate-500">
              سهم هر لاین (لیزر، فیلر، بوتاکس، جراحی، هایفو، کربن، PRP و...) در بازه زمانی انتخابی
            </p>
          </div>

          <div className="space-y-3">
            {lineStats.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">در این بازه خدمتی ثبت نشده است</p>
            ) : (
              lineStats.map((line, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{line.name}</span>
                    <div className="flex items-center gap-4 font-mono tabular-nums">
                      <span className="text-slate-500">تعداد: {line.count}</span>
                      <span className="font-bold text-slate-900">{formatToman(line.totalAmount)}</span>
                      <span className="text-sky-600 font-bold">{line.percentage}٪</span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${line.percentage}%` }}
                      className="bg-sky-500 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Financial Comprehensive Reports & Revenue Analytics */}
      {activeAdminTab === 'financial' && (
        <div className="space-y-6">
          {/* Active Period Ribbon */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-950 text-sm block">
                  {activeRangeTitle}
                </span>
                <span className="text-emerald-700 text-[11px]">
                  گزارش رسمی درآمدهای وصولی و کارکرد مطب بر اساس فیلتر زمانی فعال
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-slate-600 font-medium">مجموع وصولی:</span>
              <span className="font-mono tabular-nums font-bold text-emerald-700 text-base">
                {formatToman(financialTotals.totalPaid)}
              </span>
            </div>
          </div>

          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500/10">
              <span className="text-emerald-700 block text-[11px] font-bold">کل درآمد وصولی (دریافتی نهایی):</span>
              <div className="font-bold text-lg md:text-xl text-emerald-800 font-mono tabular-nums mt-1">
                {formatToman(financialTotals.totalPaid)}
              </div>
              <p className="text-[10px] text-emerald-600 mt-1 font-medium">واریز شده به حساب و صندوق مطب</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-400 block text-[11px]">مبلغ ناخالص کل خدمات:</span>
              <div className="font-bold text-base text-slate-900 font-mono tabular-nums mt-1">
                {formatToman(financialTotals.grossTotal)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">قبل از اعمال تخفیف</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-400 block text-[11px]">کل تخفیف‌های ارائه‌شده:</span>
              <div className="font-bold text-base text-rose-600 font-mono tabular-nums mt-1">
                {formatToman(financialTotals.totalDiscounts)}
              </div>
              <p className="text-[10px] text-rose-400 mt-1">کسر شده از صورتحساب بیماران</p>
            </div>

            <div
              onClick={() => setActiveAdminTab('receivables')}
              className="bg-white hover:bg-amber-50/50 p-4 rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400 group-hover:text-amber-800 block text-[11px] font-medium">
                  کل مطالبات و بدهی‌های معوق:
                </span>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 group-hover:bg-amber-100">
                  مشاهده طلبکاری‌ها ←
                </span>
              </div>
              <div className="font-bold text-base text-amber-700 font-mono tabular-nums mt-1">
                {formatToman(financialTotals.totalDebt)}
              </div>
              <p className="text-[10px] text-amber-600 mt-1">
                {activeReceivablesCount} فقره چک و بدهی ثبت‌شده (کلیک جهت پیگیری)
              </p>
            </div>
          </div>

          {/* Breakdown by 3 Main Clinic Departments (۱. خدمات زیبایی  ۲. خدمات لیزر بانوان  ۳. خدمات لیزر آقایان) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  تفکیک درآمد وصولی بر اساس ۳ خدمت اصلی کلینیک
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  گزارش وصولی نقدی و کارکرد به تفکیک دپارتمان‌های زیبایی، لیزر بانوان و لیزر آقایان
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveAdminTab('service_analytics')}
                  className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>👥 آمار دقیق تعداد بیماران هر خدمت</span>
                  <span>←</span>
                </button>
                <span className="text-xs font-mono tabular-nums text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-lg">
                  مجموع: {filteredAdmissions.length} پرونده
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Department 1: Beauty */}
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>۱. خدمات زیبایی</span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                    {financialTotals.beautyCount} پذیرش
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[11px] text-purple-700 block">درآمد وصولی:</span>
                  <div className="text-base font-bold text-purple-950 font-mono tabular-nums mt-0.5">
                    {formatToman(financialTotals.beautyRevenue)}
                  </div>
                </div>
                <p className="text-[10px] text-purple-600 pt-1 border-t border-purple-100">
                  بوتاکس، فیلر، هایفوتراپی، مزوتراپی، پی‌آرپی و جراحی سرپایی
                </p>
              </div>

              {/* Department 2: Laser Women */}
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                    <Zap className="w-4 h-4 text-rose-500" />
                    <span>۲. خدمات لیزر بانوان</span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                    {financialTotals.laserWomenCount} پذیرش
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[11px] text-rose-700 block">درآمد وصولی:</span>
                  <div className="text-base font-bold text-rose-950 font-mono tabular-nums mt-0.5">
                    {formatToman(financialTotals.laserWomenRevenue)}
                  </div>
                </div>
                <p className="text-[10px] text-rose-600 pt-1 border-t border-rose-100">
                  پکیج‌های توتال بادی VIP، فول‌بادی، کاربردی، اقتصادی و نواحی موضعی
                </p>
              </div>

              {/* Department 3: Laser Men */}
              <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 flex items-center gap-1.5 text-xs">
                    <Zap className="w-4 h-4 text-sky-600" />
                    <span>۳. خدمات لیزر آقایان</span>
                  </span>
                  <span className="text-[11px] font-mono tabular-nums bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                    {financialTotals.laserMenCount} پذیرش
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-[11px] text-sky-700 block">درآمد وصولی:</span>
                  <div className="text-base font-bold text-sky-950 font-mono tabular-nums mt-0.5">
                    {formatToman(financialTotals.laserMenRevenue)}
                  </div>
                </div>
                <p className="text-[10px] text-sky-600 pt-1 border-t border-sky-100">
                  پکیج‌های توتال بادی، فول‌بادی، بالاتنه، آنکارد ریش و موضعی آقایان
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Performance Chart (انتقال‌یافته به پنل مدیریت) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  نمودار تحلیلی درآمد وصولی مطب
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  روند مبالغ دریافتی بر اساس دوره زمانی انتخابی ({activeRangeTitle})
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums bg-slate-50 px-3 py-1 rounded-lg">
                <span>تعداد کل پذیرش‌ها:</span>
                <span className="font-bold text-slate-900">{filteredAdmissions.length} مورد</span>
              </div>
            </div>

            {/* Bar chart visualization */}
            <div className="pt-4">
              <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-56 pb-6 border-b border-slate-100 overflow-x-auto">
                {managementChartData.map((item, idx) => {
                  const heightPercent = Math.max((item.amount / maxManagementChartAmount) * 100, 6);

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full gap-2 group min-w-[50px]">
                      {/* Tooltip on hover */}
                      <div className="text-[10px] sm:text-[11px] font-mono tabular-nums text-slate-600 font-bold group-hover:text-emerald-700 transition-colors text-center whitespace-nowrap">
                        {formatToman(item.amount)}
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl h-full flex items-end p-1 transition-all">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-emerald-600/80 group-hover:bg-emerald-600 rounded-t-lg transition-all duration-300"
                        />
                      </div>

                      {/* Label */}
                      <span className="text-[11px] text-slate-500 font-medium text-center truncate max-w-[70px]" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
                  <span>مبالغ وصولی نقد و بانکی مطب</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  محاسبه آنی از سیستم حسابداری کلینیک
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown by Payment Methods */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">تفکیک شیوه‌های تسویه و پرداخت در این بازه</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">کارتخوان دستگاه POS:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-1 block">
                  {formatToman(financialTotals.posTotal)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">کارت به کارت:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-1 block">
                  {formatToman(financialTotals.cardTotal)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">وجه نقد:</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-1 block">
                  {formatToman(financialTotals.cashTotal)}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">چک‌های صیادی:</span>
                <span className="font-mono tabular-nums font-bold text-amber-700 text-sm mt-1 block">
                  {formatToman(financialTotals.chequeTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Transactions List for this Period */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  ریز تراکنش‌ها و کارکرد پذیرش‌های این بازه
                </h4>
                <p className="text-xs text-slate-500">
                  فهرست کامل مبالغ دریافتی به تفکیک بیمار، خدمت درمانی، پزشک/اپراتور و شیوه پرداخت
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={financialTxSearch}
                    onChange={(e) => setFinancialTxSearch(e.target.value)}
                    placeholder="جستجوی بیمار، خدمت..."
                    className="w-44 px-3 py-1.5 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 font-medium bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  {displayedFinancialAdmissions.length} تراکنش
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                    <th className="py-2.5 px-3 font-semibold">ردیف</th>
                    <th className="py-2.5 px-3 font-semibold">تاریخ پذیرش</th>
                    <th className="py-2.5 px-3 font-semibold">نام بیمار</th>
                    <th className="py-2.5 px-3 font-semibold">خدمت ارائه‌شده</th>
                    <th className="py-2.5 px-3 font-semibold">اپراتور / پزشک</th>
                    <th className="py-2.5 px-3 font-semibold text-left">تعرفه کل</th>
                    <th className="py-2.5 px-3 font-semibold text-left">تخفیف</th>
                    <th className="py-2.5 px-3 font-semibold text-left text-emerald-800">مبلغ وصولی</th>
                    <th className="py-2.5 px-3 font-semibold text-left">مانده بدهی</th>
                    <th className="py-2.5 px-3 font-semibold text-center">شیوه پرداخت</th>
                    <th className="py-2.5 px-3 font-semibold text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedFinancialAdmissions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        در این بازه زمانی هیچ پذیرش و درآمدی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    displayedFinancialAdmissions.map((adm, idx) => (
                      <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-slate-700 font-medium whitespace-nowrap">
                          {adm.date}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">{adm.patientName}</span>
                          <span className="block text-[11px] text-slate-400 font-mono">
                            {adm.patientPhone}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800">{adm.serviceName}</span>
                          {adm.details.sessionNumber && (
                            <span className="block text-[11px] text-slate-400">
                              جلسه {adm.details.sessionNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {adm.operatorName}
                        </td>
                        <td className="py-3 px-3 text-left font-mono tabular-nums text-slate-700">
                          {formatToman(adm.finalAmount)}
                        </td>
                        <td className="py-3 px-3 text-left font-mono tabular-nums text-rose-600">
                          {adm.discount > 0 ? formatToman(adm.discount) : '-'}
                        </td>
                        <td className="py-3 px-3 text-left font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                          {formatToman(adm.paidAmount)}
                        </td>
                        <td className="py-3 px-3 text-left font-mono tabular-nums">
                          {adm.debtAmount > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {formatToman(adm.debtAmount)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">تسویه</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                            title={adm.paymentNotes ? `توضیحات پرداخت: ${adm.paymentNotes}` : undefined}
                          >
                            {adm.paymentMethods && adm.paymentMethods.length > 0
                              ? adm.paymentMethods
                                  .map((m) =>
                                    m === 'pos'
                                      ? 'کارتخوان'
                                      : m === 'card_to_card'
                                      ? 'کارت به کارت'
                                      : m === 'cash'
                                      ? 'نقد'
                                      : 'چک صیادی'
                                  )
                                  .join(' + ')
                              : adm.paymentMethod === 'pos'
                              ? 'کارتخوان'
                              : adm.paymentMethod === 'card_to_card'
                              ? 'کارت به کارت'
                              : adm.paymentMethod === 'cash'
                              ? 'نقد'
                              : 'چک صیادی'}
                          </span>
                          {adm.paymentNotes && (
                            <p className="text-[10px] text-amber-800 line-clamp-1 max-w-[130px] mx-auto mt-0.5" title={adm.paymentNotes}>
                              {adm.paymentNotes}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onUpdateAdmission && (
                              <button
                                onClick={() => setEditingAdmission(adm)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer text-[11px] font-medium"
                                title="ویرایش پذیرش، تعداد و مبلغ خدمت"
                              >
                                <Edit2 className="w-3 h-3 text-sky-600" />
                                <span>ویرایش</span>
                              </button>
                            )}
                            <button
                              onClick={() => onPrintAdmission && onPrintAdmission(adm)}
                              className="inline-flex items-center gap-1 p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="چاپ فیش استاندارد A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Shareholders Distribution */}
      {activeAdminTab === 'shareholders' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">محاسبه و تقسیم سود سهامداران مطب</h4>
              <p className="text-xs text-slate-500">
                فرمول: سود خالص = کل درآمد وصولی - (سهم کارکرد اپراتورها + هزینه مواد مصرفی)
              </p>
            </div>
            <button
              onClick={() => setIsAddingShareholder(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ افزودن سهامدار</span>
            </button>
          </div>

          {/* Add Shareholder Form */}
          {isAddingShareholder && (
            <form onSubmit={handleAddShareholder} className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">نام سهامدار:</label>
                <input
                  type="text"
                  required
                  value={newShName}
                  onChange={(e) => setNewShName(e.target.value)}
                  placeholder="مثال: دکتر ..."
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">درصد سهم (٪):</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newShPercent}
                  onChange={(e) => setNewShPercent(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div className="flex items-end gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => setIsAddingShareholder(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white rounded-lg font-medium"
                >
                  ذخیره سهامدار
                </button>
              </div>
            </form>
          )}

          {/* Profit Calculation Summary Ribbon */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">کل درآمد وصولی:</span>
              <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                {formatToman(shareholdersReport.totalRevenue)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">کسر سهم اپراتورها:</span>
              <span className="font-mono tabular-nums font-bold text-rose-600 text-sm">
                - {formatToman(shareholdersReport.totalOperatorCommissions)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">کسر مواد مصرفی:</span>
              <span className="font-mono tabular-nums font-bold text-rose-600 text-sm">
                - {formatToman(shareholdersReport.estimatedConsumablesCost)}
              </span>
            </div>
            <div className="border-r border-slate-200 pr-4">
              <span className="text-emerald-700 block font-bold">سود خالص قابل تقسیم:</span>
              <span className="font-mono tabular-nums font-bold text-emerald-800 text-base">
                {formatToman(shareholdersReport.netClinicProfit)}
              </span>
            </div>
          </div>

          {/* Shareholders Payout Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-3 font-semibold">نام سهامدار</th>
                  <th className="py-2.5 px-3 font-semibold text-center">درصد مالکیت سهام</th>
                  <th className="py-2.5 px-3 font-semibold text-left">مبلغ سهم سود محاسبه‌شده</th>
                  <th className="py-2.5 px-3 font-semibold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {shareholdersReport.shareholderShares.map((sh) => (
                  <tr key={sh.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{sh.name}</td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-sky-700">
                      {sh.sharePercentage}٪
                    </td>
                    <td className="py-3 px-3 text-left font-mono tabular-nums font-bold text-emerald-700 text-sm">
                      {formatToman(sh.calculatedAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          const newP = prompt(`درصد جدید برای ${sh.name}:`, String(sh.sharePercentage));
                          if (newP) {
                            const val = parseFloat(newP);
                            if (!isNaN(val)) {
                              onUpdateShareholders(
                                shareholders.map((s) =>
                                  s.id === sh.id ? { ...s, sharePercentage: val } : s
                                )
                              );
                            }
                          }
                        }}
                        className="text-xs text-sky-600 hover:text-sky-700 font-medium px-2 py-1 rounded hover:bg-sky-50"
                      >
                        ویرایش درصد
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Consumables Management */}
      {activeAdminTab === 'consumables' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">مدیریت لیست اقلام و مواد مصرفی</h4>
              <p className="text-xs text-slate-500">
                تعریف اقلام مصرفی مورد نیاز پذیرش و هزینه مصوب هر قلم
              </p>
            </div>
            <button
              onClick={() => setIsAddingConsumable(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ افزودن قلم جدید</span>
            </button>
          </div>

          {/* Add Consumable Form */}
          {isAddingConsumable && (
            <form onSubmit={handleAddConsumable} className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">نام قلم مصرفی:</label>
                <input
                  type="text"
                  required
                  value={newConsumableName}
                  onChange={(e) => setNewConsumableName(e.target.value)}
                  placeholder="مثال: سرسوزن گیج ۳۰"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">هزینه پیش‌فرض (ریال):</label>
                <input
                  type="number"
                  value={newConsumableCost}
                  onChange={(e) => setNewConsumableCost(parseFloat(e.target.value) || 0)}
                  className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div className="flex items-end gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => setIsAddingConsumable(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white rounded-lg font-medium"
                >
                  افزودن
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-3 font-semibold">نام قلم مصرفی</th>
                  <th className="py-2.5 px-3 font-semibold text-left">هزینه محاسبه‌شده</th>
                  <th className="py-2.5 px-3 font-semibold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {consumablesList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900">{item.name}</td>
                    <td className="py-3 px-3 text-left font-mono tabular-nums font-semibold">
                      {item.cost > 0 ? formatToman(item.cost) : 'رایگان'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          const costStr = prompt(`هزینه جدید برای ${item.name} (ریال):`, String(item.cost));
                          if (costStr) {
                            const val = parseFloat(costStr);
                            if (!isNaN(val)) {
                              onUpdateConsumables(
                                consumablesList.map((c, i) => (i === idx ? { ...c, cost: val } : c))
                              );
                            }
                          }
                        }}
                        className="text-xs text-sky-600 hover:text-sky-700 font-medium px-2 py-1 rounded hover:bg-sky-50"
                      >
                        ویرایش هزینه
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeAdminTab === 'admin_tools' && (
        <AdminToolsPanel
          settings={settings}
          clinicData={clinicData}
          onUpdateSettings={onUpdateSettings}
          onExportData={onExportData}
          onImportData={onImportData}
          onToast={onToast}
        />
      )}

      {/* Edit Admission Modal */}
      {editingAdmission && (
        <EditAdmissionModal
          admission={editingAdmission}
          operators={operators}
          onClose={() => setEditingAdmission(null)}
          onSave={(updated) => onUpdateAdmission?.(updated)}
          onPrint={onPrintAdmission}
        />
      )}
    </div>
  );
};
