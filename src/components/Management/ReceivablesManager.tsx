import React, { useState, useMemo } from 'react';
import {
  Search,
  Phone,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  CreditCard,
  Receipt,
  FileText,
  CheckCircle2,
  Calendar,
  X,
  Edit,
  User,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Building
} from 'lucide-react';
import { Admission, ChequeDetails, Patient, PaymentMethod } from '../../types';
import {
  formatToman,
  formatPersianDateReadable,
  getTodayPersianDate,
  getDaysDifference
} from '../../utils/persianDate';

interface ReceivablesManagerProps {
  admissions: Admission[];
  patients?: Patient[];
  onUpdateAdmission?: (updated: Admission) => void;
  onOpenPatientDossier?: (patientId: string) => void;
}

export interface ReceivableItem {
  id: string; // unique key
  admissionId: string;
  admission: Admission;
  type: 'cheque' | 'invoice_debt';
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientNationalId: string;
  serviceName: string;
  admissionDate: string;
  // Financials
  totalAmount: number;
  paidAmount: number;
  receivableAmount: number; // المبلغ المطلوب
  // Cheque specific
  chequeDetails?: ChequeDetails;
  dueDate: string;          // For cheque: dueDate; For invoice debt: admissionDate
  daysDiff: number;         // negative = overdue; 0 = today; positive = days left
  status: 'pending' | 'cleared' | 'bounced';
  followUpNote?: string;
}

type TypeFilter = 'all' | 'cheque' | 'invoice_debt' | 'overdue' | 'due_soon';
type StatusFilter = 'active' | 'cleared' | 'bounced' | 'all_statuses';

export const ReceivablesManager: React.FC<ReceivablesManagerProps> = ({
  admissions,
  patients = [],
  onUpdateAdmission,
  onOpenPatientDossier,
}) => {
  const today = getTodayPersianDate();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // UI helpers
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Settlement Modal State
  const [settlingItem, setSettlingItem] = useState<ReceivableItem | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('pos');
  const [settleNote, setSettleNote] = useState<string>('');

  // Note Modal State
  const [editingNoteItem, setEditingNoteItem] = useState<ReceivableItem | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Compile all receivables from admissions
  const allReceivables = useMemo(() => {
    const list: ReceivableItem[] = [];

    admissions.forEach((adm) => {
      if (adm.status === 'cancelled') return;

      const hasCheque =
        adm.paymentMethod === 'cheque' ||
        adm.paymentMethods?.includes('cheque') ||
        !!adm.chequeDetails;

      if (hasCheque && adm.chequeDetails) {
        const c = adm.chequeDetails;
        const daysDiff = getDaysDifference(c.dueDate, today);
        list.push({
          id: `cheque-${adm.id}`,
          admissionId: adm.id,
          admission: adm,
          type: 'cheque',
          patientId: adm.patientId,
          patientName: adm.patientName,
          patientPhone: adm.patientPhone,
          patientNationalId: adm.patientNationalId,
          serviceName: adm.serviceName,
          admissionDate: adm.date,
          totalAmount: adm.finalAmount,
          paidAmount: adm.paidAmount,
          receivableAmount: c.amount || adm.debtAmount || (adm.finalAmount - adm.paidAmount),
          chequeDetails: c,
          dueDate: c.dueDate,
          daysDiff,
          status: c.status || 'pending',
          followUpNote: c.notes || adm.details.notes,
        });
      } else if (adm.debtAmount > 0) {
        // Invoice debt balance (بدون چک)
        const daysDiff = getDaysDifference(adm.date, today); // negative days since visit
        list.push({
          id: `debt-${adm.id}`,
          admissionId: adm.id,
          admission: adm,
          type: 'invoice_debt',
          patientId: adm.patientId,
          patientName: adm.patientName,
          patientPhone: adm.patientPhone,
          patientNationalId: adm.patientNationalId,
          serviceName: adm.serviceName,
          admissionDate: adm.date,
          totalAmount: adm.finalAmount,
          paidAmount: adm.paidAmount,
          receivableAmount: adm.debtAmount,
          dueDate: adm.date,
          daysDiff,
          status: 'pending',
          followUpNote: adm.details.notes || adm.paymentNotes,
        });
      }
    });

    return list;
  }, [admissions, today]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const activeItems = allReceivables.filter((r) => r.status === 'pending');
    const totalActiveDebt = activeItems.reduce((sum, r) => sum + r.receivableAmount, 0);

    const cheques = activeItems.filter((r) => r.type === 'cheque');
    const totalChequesAmount = cheques.reduce((sum, r) => sum + r.receivableAmount, 0);

    const invoiceDebts = activeItems.filter((r) => r.type === 'invoice_debt');
    const totalInvoiceDebtAmount = invoiceDebts.reduce((sum, r) => sum + r.receivableAmount, 0);

    const overdueItems = activeItems.filter((r) => r.daysDiff < 0);
    const totalOverdueAmount = overdueItems.reduce((sum, r) => sum + r.receivableAmount, 0);

    const dueSoonItems = activeItems.filter((r) => r.daysDiff >= 0 && r.daysDiff <= 7);

    return {
      totalActiveDebt,
      activeCount: activeItems.length,
      chequesCount: cheques.length,
      totalChequesAmount,
      invoiceDebtsCount: invoiceDebts.length,
      totalInvoiceDebtAmount,
      overdueCount: overdueItems.length,
      totalOverdueAmount,
      dueSoonCount: dueSoonItems.length,
    };
  }, [allReceivables]);

  // Filtered List
  const displayedReceivables = useMemo(() => {
    return allReceivables.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && item.status !== 'pending') return false;
      if (statusFilter === 'cleared' && item.status !== 'cleared') return false;
      if (statusFilter === 'bounced' && item.status !== 'bounced') return false;

      // Type / Overdue filter
      if (typeFilter === 'cheque' && item.type !== 'cheque') return false;
      if (typeFilter === 'invoice_debt' && item.type !== 'invoice_debt') return false;
      if (typeFilter === 'overdue' && item.daysDiff >= 0) return false;
      if (typeFilter === 'due_soon' && (item.daysDiff < 0 || item.daysDiff > 7)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = item.patientName.toLowerCase().includes(q);
        const matchesPhone = item.patientPhone.includes(q);
        const matchesNational = item.patientNationalId.includes(q);
        const matchesService = item.serviceName.toLowerCase().includes(q);
        const matchesChequeNo = item.chequeDetails?.chequeNumber.includes(q);
        const matchesBank = item.chequeDetails?.bankName.toLowerCase().includes(q);
        const matchesIssuer = item.chequeDetails?.issuer.toLowerCase().includes(q);

        if (
          !matchesName &&
          !matchesPhone &&
          !matchesNational &&
          !matchesService &&
          !matchesChequeNo &&
          !matchesBank &&
          !matchesIssuer
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Overdue first, then soonest due
      if (a.status === 'pending' && b.status === 'pending') {
        return a.daysDiff - b.daysDiff;
      }
      return 0;
    });
  }, [allReceivables, statusFilter, typeFilter, searchQuery]);

  // Execute Settlement
  const handleConfirmSettlement = () => {
    if (!settlingItem || !onUpdateAdmission) return;
    const adm = settlingItem.admission;

    if (settlingItem.type === 'cheque' && settlingItem.chequeDetails) {
      // Settle cheque
      const updatedCheque: ChequeDetails = {
        ...settlingItem.chequeDetails,
        status: 'cleared',
        notes: (settlingItem.chequeDetails.notes || '') + (settleNote ? ` [وصول شد: ${settleNote}]` : ' [چک وصول شد]'),
      };

      const newPaid = adm.paidAmount + settleAmount;
      const newDebt = Math.max(0, adm.debtAmount - settleAmount);

      const updatedAdm: Admission = {
        ...adm,
        paidAmount: newPaid,
        debtAmount: newDebt,
        chequeDetails: updatedCheque,
      };

      onUpdateAdmission(updatedAdm);
    } else {
      // Settle invoice debt
      const newPaid = adm.paidAmount + settleAmount;
      const newDebt = Math.max(0, adm.debtAmount - settleAmount);

      const updatedAdm: Admission = {
        ...adm,
        paidAmount: newPaid,
        debtAmount: newDebt,
        paymentNotes: (adm.paymentNotes || '') + (settleNote ? ` [تسویه: ${settleNote}]` : ' [تسویه مانده حساب]'),
      };

      onUpdateAdmission(updatedAdm);
    }

    setSettlingItem(null);
  };

  // Toggle Cheque Bounced/Pending
  const handleToggleChequeStatus = (item: ReceivableItem, newStatus: 'pending' | 'bounced' | 'cleared') => {
    if (!onUpdateAdmission || !item.chequeDetails) return;
    const updatedCheque: ChequeDetails = {
      ...item.chequeDetails,
      status: newStatus,
    };
    const updatedAdm: Admission = {
      ...item.admission,
      chequeDetails: updatedCheque,
    };
    onUpdateAdmission(updatedAdm);
  };

  // Save Follow-up Note
  const handleSaveNote = () => {
    if (!editingNoteItem || !onUpdateAdmission) return;
    const adm = editingNoteItem.admission;

    if (editingNoteItem.type === 'cheque' && editingNoteItem.chequeDetails) {
      const updatedCheque: ChequeDetails = {
        ...editingNoteItem.chequeDetails,
        notes: noteText,
      };
      onUpdateAdmission({
        ...adm,
        chequeDetails: updatedCheque,
      });
    } else {
      onUpdateAdmission({
        ...adm,
        paymentNotes: noteText,
      });
    }

    setEditingNoteItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
          <CreditCard className="w-56 h-56 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium mb-2 border border-emerald-400/20">
              <Phone className="w-3.5 h-3.5" />
              <span>مدیریت وصول مطالبات، چک‌ها و بدهکاران مطب</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              لیست طلبکاری‌های مطب و پیگیری تلفنی
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              مشاهده تمامی چک‌های در انتظار وصول صیادی و مانده بدهی‌های بیماران با شماره تماس مستقیم جهت برقراری تماس تلفنی، پیگیری سررسید و ثبت وصول وجه.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center min-w-[220px]">
            <span className="text-[11px] text-emerald-200 block">مجموع کل طلبکاری‌های جاری:</span>
            <span className="text-2xl font-black text-amber-300 block mt-1 font-mono tabular-nums">
              {formatToman(kpis.totalActiveDebt)}
            </span>
            <span className="text-xs text-white/80 block mt-1">
              شامل {kpis.activeCount} مورد فعال ({kpis.chequesCount} فقره چک + {kpis.invoiceDebtsCount} مانده فاکتور)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Cheques */}
        <div
          onClick={() => setTypeFilter('cheque')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'cheque'
              ? 'bg-amber-50/90 border-amber-300 shadow-xs ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200/90 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700">اسناد دریافتنی (چک‌ها)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-amber-900 tabular-nums">
            {formatToman(kpis.totalChequesAmount)}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            {kpis.chequesCount} فقره چک صیادی در جریان
          </div>
        </div>

        {/* KPI 2: Invoice Debts */}
        <div
          onClick={() => setTypeFilter('invoice_debt')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'invoice_debt'
              ? 'bg-blue-50/90 border-blue-300 shadow-xs ring-2 ring-blue-400/30'
              : 'bg-white border-slate-200/90 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700">مانده بدهی فاکتورها</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-blue-900 tabular-nums">
            {formatToman(kpis.totalInvoiceDebtAmount)}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 font-medium">
            {kpis.invoiceDebtsCount} پرونده دارای مانده حساب
          </div>
        </div>

        {/* KPI 3: Overdue / Urgent Alert */}
        <div
          onClick={() => setTypeFilter('overdue')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'overdue'
              ? 'bg-rose-50/90 border-rose-300 shadow-xs ring-2 ring-rose-400/30'
              : 'bg-white border-slate-200/90 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-rose-700">سررسید گذشته (فوری)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-rose-700 tabular-nums">
            {formatToman(kpis.totalOverdueAmount)}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-bold">
            {kpis.overdueCount > 0 ? `⚠️ ${kpis.overdueCount} مورد نیازمند تماس فوری` : 'بدون مورد معوقه'}
          </div>
        </div>

        {/* KPI 4: Due Soon (This Week) */}
        <div
          onClick={() => setTypeFilter('due_soon')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'due_soon'
              ? 'bg-emerald-50/90 border-emerald-300 shadow-xs ring-2 ring-emerald-400/30'
              : 'bg-white border-slate-200/90 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700">سررسید تا ۷ روز آینده</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-emerald-900 tabular-nums">
            {kpis.dueSoonCount} مورد
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            آماده پیگیری و وصول این هفته
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        {/* Type pills & Status tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              در انتظار وصول ({kpis.activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('cleared')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'cleared'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تسویه و وصول شده‌ها
            </button>
            <button
              onClick={() => setStatusFilter('bounced')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'bounced'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              چک‌های برگشتی
            </button>
            <button
              onClick={() => setStatusFilter('all_statuses')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'all_statuses'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه وضعیت‌ها
            </button>
          </div>

          {/* Quick Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'all' as TypeFilter, label: 'همه مطالبات' },
              { id: 'cheque' as TypeFilter, label: '💳 فقط چک‌ها' },
              { id: 'invoice_debt' as TypeFilter, label: '📄 فقط مانده فاکتور' },
              { id: 'overdue' as TypeFilter, label: '⚠️ سررسید گذشته' },
              { id: 'due_soon' as TypeFilter, label: '⏳ سررسید این هفته' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                  typeFilter === f.id
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام بیمار، شماره تماس، شماره چک، نام بانک یا نام صادرکننده..."
            className="w-full pr-9 pl-8 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
      </div>

      {/* Receivables List / Cards */}
      {displayedReceivables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">هیچ موردی مطابق فیلتر یافت نشد</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            یا تمامی مطالبات این بخش وصول شده‌اند، یا فیلترهای جستجو موردی را شامل نمی‌شوند.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
              setStatusFilter('all_statuses');
            }}
            className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
          >
            نمایش تمامی پرونده‌ها
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedReceivables.map((item) => {
            const isCheque = item.type === 'cheque';
            const isOverdue = item.daysDiff < 0;
            const isDueToday = item.daysDiff === 0;
            const isCleared = item.status === 'cleared';
            const isBounced = item.status === 'bounced';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all hover:shadow-md ${
                  isBounced
                    ? 'border-rose-300 bg-rose-50/20'
                    : isOverdue && !isCleared
                    ? 'border-rose-200/90 hover:border-rose-300'
                    : 'border-slate-200/90 hover:border-emerald-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Patient Details & Debt Specs */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                        isCheque
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isCheque ? <CreditCard className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Name, Badges & Due Status */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm sm:text-base">
                          {item.patientName}
                        </h4>

                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            isCheque
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isCheque ? '💳 چک صیادی' : '📄 مانده فاکتور'}
                        </span>

                        {/* Due status badge */}
                        {isCleared ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ وصول و تسویه شده
                          </span>
                        ) : isBounced ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                            ⚠️ چک برگشت خورده
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ⚠️ {Math.abs(item.daysDiff)} روز از موعد گذشته (معوق)
                          </span>
                        ) : isDueToday ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white">
                            ⏳ موعد سررسید: امروز
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                            📅 {item.daysDiff} روز تا سررسید ({formatPersianDateReadable(item.dueDate)})
                          </span>
                        )}
                      </div>

                      {/* Cheque / Debt Specific Details */}
                      {isCheque && item.chequeDetails ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-slate-400">شماره صیادی/چک:</span>
                            <strong className="text-slate-900">{item.chequeDetails.chequeNumber}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">بانک:</span>
                            <strong className="text-slate-800">{item.chequeDetails.bankName}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">صادرکننده:</span>
                            <strong className="text-slate-800">{item.chequeDetails.issuer}</strong>
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-slate-400">تاریخ سررسید:</span>
                            <strong className={isOverdue ? 'text-rose-700' : 'text-slate-900'}>
                              {item.chequeDetails.dueDate}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span>
                            خدمت: <strong className="text-slate-800">{item.serviceName}</strong>
                          </span>
                          <span className="font-mono">
                            تاریخ ویزیت: <strong>{item.admissionDate}</strong>
                          </span>
                          <span>
                            کل فاکتور: <span className="font-mono">{formatToman(item.totalAmount)}</span>
                          </span>
                          <span>
                            پرداخت قبلی: <span className="font-mono">{formatToman(item.paidAmount)}</span>
                          </span>
                        </div>
                      )}

                      {/* Follow-up Note Snippet */}
                      {item.followUpNote && (
                        <div className="text-xs text-slate-500 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
                          <span className="font-bold text-amber-800 shrink-0">یادداشت پیگیری:</span>
                          <span className="leading-relaxed">{item.followUpNote}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Quick Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Amount */}
                    <div className="text-right lg:text-left">
                      <span className="text-[11px] text-slate-400 block">مبلغ قابل وصول / بدهی:</span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-rose-700 tabular-nums block">
                        {formatToman(item.receivableAmount)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {/* Big Click-to-Call Button (User's primary request: زنگ بزنیم پولشونو بدن) */}
                      <a
                        href={`tel:${item.patientPhone}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        title="تماس مستقیم با بیمار جهت پیگیری پرداخت"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-mono">{item.patientPhone}</span>
                        <span className="hidden sm:inline text-[11px] opacity-90">(تماس)</span>
                      </a>

                      {/* Copy Phone */}
                      <button
                        onClick={(e) => handleCopyPhone(item.patientPhone, e)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                        title="کپی شماره تلفن همراه"
                      >
                        {copiedPhone === item.patientPhone ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Log Follow-up Note */}
                      <button
                        onClick={() => {
                          setEditingNoteItem(item);
                          setNoteText(item.followUpNote || '');
                        }}
                        className="p-2 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all border border-slate-200 cursor-pointer"
                        title="ثبت یادداشت پیگیری تلفنی"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Open Patient Dossier */}
                      {onOpenPatientDossier && (
                        <button
                          onClick={() => onOpenPatientDossier(item.patientId)}
                          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer"
                          title="مشاهده پرونده کامل بیمار"
                        >
                          پرونده
                        </button>
                      )}

                      {/* Settle / Clear Debt Button */}
                      {!isCleared && (
                        <button
                          onClick={() => {
                            setSettlingItem(item);
                            setSettleAmount(item.receivableAmount);
                            setSettleMethod('pos');
                            setSettleNote('');
                          }}
                          className="px-3 py-2 bg-slate-900 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          title="ثبت وصول وجه و تسویه حساب"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ثبت وصول</span>
                        </button>
                      )}

                      {/* Cheque status options (bounced / pending) */}
                      {isCheque && (
                        <div className="relative group">
                          {isBounced ? (
                            <button
                              onClick={() => handleToggleChequeStatus(item, 'pending')}
                              className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              بازگشت به انتظار
                            </button>
                          ) : !isCleared ? (
                            <button
                              onClick={() => handleToggleChequeStatus(item, 'bounced')}
                              className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="تغییر به چک برگشتی"
                            >
                              برگشت چک
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settlement Modal (تسویه حساب و وصول وجه) */}
      {settlingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 bg-gradient-to-l from-emerald-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm">
                  {settlingItem.type === 'cheque' ? 'ثبت وصول چک بانکی' : 'تسویه بدهی بیمار'}
                </h4>
              </div>
              <button
                onClick={() => setSettlingItem(null)}
                className="p-1 text-white/70 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">بیمار:</span>
                  <strong className="text-slate-800">{settlingItem.patientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">شماره تماس:</span>
                  <span className="font-mono text-slate-800">{settlingItem.patientPhone}</span>
                </div>
                {settlingItem.chequeDetails && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">مشخصات چک:</span>
                    <span className="font-mono text-slate-800">
                      {settlingItem.chequeDetails.bankName} - {settlingItem.chequeDetails.chequeNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600 font-bold">مبلغ باقیمانده طلب:</span>
                  <strong className="text-rose-700 font-mono text-sm font-black">
                    {formatToman(settlingItem.receivableAmount)}
                  </strong>
                </div>
              </div>

              {/* Amount to settle */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  مبلغ دریافتی (تومان / ریال):
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  معادل: {formatToman(settleAmount)}
                </span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">روش دریافت وجه:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pos' as PaymentMethod, label: 'دستگاه کارتخوان (POS)' },
                    { id: 'card_to_card' as PaymentMethod, label: 'کارت به کارت' },
                    { id: 'cash' as PaymentMethod, label: 'نقدی' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSettleMethod(m.id)}
                      className={`p-2 rounded-xl text-center font-medium transition-all cursor-pointer ${
                        settleMethod === m.id
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و شماره پیگیری:</label>
                <input
                  type="text"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="مثلاً: واریز به حساب ملی، شماره پیگیری ۷۸۴۵۱۲..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettlingItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                تأیید و ثبت وصول وجه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal (یادداشت پیگیری تلفنی) */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm">ثبت یادداشت پیگیری تلفنی</h4>
              </div>
              <button
                onClick={() => setEditingNoteItem(null)}
                className="p-1 text-white/70 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                نتیجه تماس یا هماهنگی با بیمار <strong>{editingNoteItem.patientName}</strong> را یادداشت کنید:
              </p>
              <textarea
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="مثلاً: امروز تماس گرفته شد، اعلام کردند فردا تا ساعت ۱۲ چک پاس می‌شود یا مبلغ واریز خواهد شد..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:border-amber-500 leading-relaxed"
              />
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingNoteItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                ذخیره یادداشت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
