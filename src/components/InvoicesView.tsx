import React, { useMemo, useState } from 'react';
import { CheckCircle2, CircleDollarSign, FileText, Ban, Search, Plus, Clock3 } from 'lucide-react';
import { Admission, FollowUpReminder, Patient, PaymentMethod, ServiceDefinition, Operator } from '../types';
import { formatToman, getTodayPersianDate } from '../utils/persianDate';
import { getApiUrl } from '../utils/api';

type ViewTab = 'active' | 'voided' | 'deposits';

interface InvoicesViewProps {
  admissions: Admission[];
  patients: Patient[];
  services: ServiceDefinition[];
  operators: Operator[];
  onAdmissionCreated: (admission: Admission, reminder?: FollowUpReminder) => boolean;
  onUpdateAdmission: (admission: Admission) => void;
  onUpdateFollowUpStatus: (id: string, status: 'cancelled' | 'attended', notes?: string) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onPrintAdmission: (admission: Admission) => void;
}

const paymentLabels: Record<PaymentMethod, string> = {
  pos: 'کارتخوان',
  card_to_card: 'کارت‌به‌کارت',
  cash: 'نقدی',
  cheque: 'چک',
};

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  admissions, patients, services, operators, onAdmissionCreated,
  onUpdateAdmission, onUpdateFollowUpStatus, onToast, onPrintAdmission,
}) => {
  const [tab, setTab] = useState<ViewTab>('active');
  const [search, setSearch] = useState('');
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [procedureDate, setProcedureDate] = useState(getTodayPersianDate());
  const [procedureTime, setProcedureTime] = useState('10:00');
  const [totalToman, setTotalToman] = useState('');
  const [depositToman, setDepositToman] = useState('');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('pos');
  const [depositNotes, setDepositNotes] = useState('');
  const [balanceMethods, setBalanceMethods] = useState<Record<string, PaymentMethod>>({});
  const [balanceAmounts, setBalanceAmounts] = useState<Record<string, string>>({});

  const activeAdmissions = useMemo(
    () => admissions.filter(a => a.status !== 'cancelled' && a.registrationStatus !== 'temporary'),
    [admissions]
  );
  const voidedAdmissions = useMemo(() => admissions.filter(a => a.status === 'cancelled'), [admissions]);
  const pendingDeposits = useMemo(
    () => activeAdmissions.filter(a => a.deposit?.status === 'reserved').sort((a,b) => (a.deposit?.scheduledDate || '').localeCompare(b.deposit?.scheduledDate || '')),
    [activeAdmissions]
  );
  const filtered = useMemo(() => {
    const source = tab === 'voided' ? voidedAdmissions : tab === 'deposits' ? pendingDeposits : activeAdmissions.filter(a => !a.deposit || a.deposit.status !== 'reserved');
    const q = search.trim().toLocaleLowerCase();
    if (!q) return source;
    return source.filter(a =>
      a.patientName.toLocaleLowerCase().includes(q) ||
      a.patientPhone.includes(q) ||
      a.admissionNumber.toLocaleLowerCase().includes(q) ||
      a.serviceName.toLocaleLowerCase().includes(q)
    );
  }, [tab, search, activeAdmissions, voidedAdmissions, pendingDeposits]);

  const resetDepositForm = () => {
    setShowDepositForm(false);
    setPatientId('');
    setServiceId('');
    setOperatorId('');
    setProcedureDate(getTodayPersianDate());
    setProcedureTime('10:00');
    setTotalToman('');
    setDepositToman('');
    setDepositMethod('pos');
    setDepositNotes('');
  };

  const createDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === patientId);
    const service = services.find(s => s.id === serviceId);
    const operator = operators.find(o => o.id === operatorId) || operators[0];
    const total = Math.round(Number(totalToman) * 10);
    const deposit = Math.round(Number(depositToman) * 10);
    if (!patient || !service || !operator) {
      onToast('بیمار، خدمت و پزشک/اپراتور را انتخاب کنید.', 'error');
      return;
    }
    if (!procedureDate.trim() || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(procedureTime)) {
      onToast('تاریخ و ساعت معتبر نوبت عمل را وارد کنید.', 'error');
      return;
    }
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(deposit) || deposit <= 0 || deposit >= total) {
      onToast('مبلغ بیعانه باید بیشتر از صفر و کمتر از مبلغ کل فاکتور باشد.', 'error');
      return;
    }
    const now = Date.now();
    const fullName = `${patient.firstName} ${patient.lastName}`;
    const admission: Admission = {
      id: `adm-deposit-${now}`,
      admissionNumber: `DEP-${now.toString().slice(-8)}`,
      patientId: patient.id,
      patientName: fullName,
      patientPhone: patient.phone,
      patientNationalId: patient.nationalId,
      serviceId: service.id,
      serviceName: service.name,
      serviceCategory: service.category,
      serviceItems: [{
        serviceId: service.id,
        serviceName: service.name,
        serviceCategory: service.category,
        quantity: 1,
        quantityLabel: '۱',
        unitPrice: total,
        totalAmount: total,
        details: { surgeryType: service.name, notes: depositNotes.trim() || undefined },
      }],
      operatorId: operator.id,
      operatorName: operator.name,
      date: getTodayPersianDate(),
      timestamp: now,
      details: { surgeryType: service.name, notes: depositNotes.trim() || undefined },
      consumables: [],
      basePrice: total,
      quantity: 1,
      discount: 0,
      finalAmount: total,
      paidAmount: deposit,
      debtAmount: total - deposit,
      paymentMethod: depositMethod,
      paymentMethods: [depositMethod],
      paymentNotes: `بیعانه عمل: ${formatToman(deposit)} تومان؛ موعد عمل: ${procedureDate} ساعت ${procedureTime}${depositNotes.trim() ? `؛ ${depositNotes.trim()}` : ''}`,
      followUpDate: procedureDate,
      followUpReason: `نوبت عمل؛ بیعانه پرداخت شده (${formatToman(deposit)} تومان)`,
      status: 'completed',
      registrationStatus: 'final',
      deposit: {
        amount: deposit,
        paymentMethod: depositMethod,
        scheduledDate: procedureDate,
        scheduledTime: procedureTime,
        status: 'reserved',
        notes: depositNotes.trim() || undefined,
      },
    };
    const reminder: FollowUpReminder = {
      id: `flw-deposit-${now}`,
      patientId: patient.id,
      patientName: fullName,
      patientPhone: patient.phone,
      admissionId: admission.id,
      serviceName: service.name,
      operatorName: operator.name,
      previousVisitDate: getTodayPersianDate(),
      scheduledDate: procedureDate,
      status: 'pending',
      reason: `نوبت عمل ${service.name}؛ بیعانه ${formatToman(deposit)} تومان پرداخت شده است. ساعت ${procedureTime}`,
      notes: depositNotes.trim() || undefined,
    };
    if (!onAdmissionCreated(admission, reminder)) return;
    if (patient.phone?.trim()) {
      fetch(getApiUrl('/api/sms/appointment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: patient.phone, patientName: fullName, date: procedureDate, time: procedureTime }),
      }).then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) onToast(result.message || 'نوبت و بیعانه ثبت شد، اما ارسال پیامک ناموفق بود.', 'error');
      }).catch(() => onToast('نوبت و بیعانه ثبت شد، اما ارتباط با سرویس پیامک برقرار نشد.', 'error'));
    }
    onToast('نوبت عمل و بیعانه با موفقیت ثبت شد.');
    resetDepositForm();
    setTab('deposits');
  };

  const voidInvoice = (admission: Admission) => {
    const reason = window.prompt('دلیل ابطال فاکتور را وارد کنید:');
    if (reason === null) return;
    if (!reason.trim()) {
      onToast('برای ابطال فاکتور ثبت دلیل الزامی است.', 'error');
      return;
    }
    if (!window.confirm(`فاکتور ${admission.admissionNumber} باطل شود؟ این فاکتور حذف نخواهد شد.`)) return;
    onUpdateAdmission({ ...admission, status: 'cancelled', voidedAt: Date.now(), voidReason: reason.trim() });
    onUpdateFollowUpStatus(admission.id, 'cancelled', `فاکتور ابطال شد: ${reason.trim()}`);
    onToast('فاکتور ابطال شد و در سوابق باقی ماند.', 'success');
  };

  const completeDeposit = (admission: Admission) => {
    const remaining = Math.max(0, admission.finalAmount - (admission.deposit?.amount || 0));
    const method = balanceMethods[admission.id] || 'pos';
    const enteredToman = balanceAmounts[admission.id];
    const balancePaid = enteredToman === undefined || enteredToman.trim() === '' ? remaining : Math.round(Number(enteredToman) * 10);
    if (balancePaid !== remaining) {
      onToast(`مبلغ تسویه باید دقیقاً برابر مانده فاکتور باشد: ${formatToman(remaining)} تومان.`, 'error');
      return;
    }
    if (!window.confirm(`دریافت مانده ${formatToman(remaining)} تومان و تسویه فاکتور تأیید شود؟`)) return;
    const oldMethods = admission.paymentMethods?.length ? admission.paymentMethods : [admission.paymentMethod];
    const methods = Array.from(new Set([...oldMethods, method]));
    const updated: Admission = {
      ...admission,
      paidAmount: admission.finalAmount,
      debtAmount: 0,
      paymentMethods: methods,
      paymentMethod: oldMethods[0] || admission.paymentMethod,
      paymentNotes: `بیعانه ${formatToman(admission.deposit?.amount || 0)} تومان با ${paymentLabels[admission.deposit?.paymentMethod || admission.paymentMethod]} دریافت شد؛ مانده ${formatToman(remaining)} تومان با ${paymentLabels[method]} تسویه شد.${admission.deposit?.notes ? `؛ توضیحات: ${admission.deposit.notes}` : ''}`,
      deposit: { ...admission.deposit!, status: 'completed', balancePaidAmount: remaining, balancePaymentMethod: method, completedAt: Date.now() },
    };
    onUpdateAdmission(updated);
    onUpdateFollowUpStatusForAdmission(admission, 'attended');
    onToast('مانده دریافت شد؛ فاکتور با مبلغ کل و بیعانه ثبت‌شده تسویه شد.');
    setBalanceAmounts(prev => ({ ...prev, [admission.id]: '' }));
  };

  const onUpdateFollowUpStatusForAdmission = (admission: Admission, status: 'cancelled' | 'attended') => {
    // Parent callback updates reminders associated with this admission.
    onUpdateFollowUpStatus(admission.id, status, status === 'attended' ? 'عمل انجام شد و فاکتور تسویه شد.' : 'نوبت عمل لغو شد.');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5" dir="rtl">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">فاکتورها و بیعانه‌ها</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500">ثبت و پیگیری فاکتورها، ابطال بدون حذف و تسویه بیعانه عمل‌ها</p>
        </div>
        <button onClick={() => { setShowDepositForm(v => !v); setTab('deposits'); }} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-700">
          <Plus className="h-4 w-4" /> ثبت نوبت عمل با بیعانه
        </button>
      </div>

      {showDepositForm && (
        <form onSubmit={createDeposit} className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-5">
          <div className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-sky-700" /><h3 className="font-bold text-slate-900">ثبت بیعانه و رزرو نوبت عمل</h3></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">بیمار</span><select required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">انتخاب بیمار</option>{patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.phone}</option>)}</select></label>
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">خدمت / عمل</span><select required value={serviceId} onChange={e => { setServiceId(e.target.value); const s=services.find(x=>x.id===e.target.value); if(s && !totalToman) setTotalToman(String(Math.round(s.defaultPrice/10))); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">انتخاب خدمت</option>{services.filter(s=>s.active).sort((a,b)=>Number(b.category==='surgery')-Number(a.category==='surgery')).map(s=><option key={s.id} value={s.id}>{s.name}{s.category==='surgery'?' (عمل)':''}</option>)}</select></label>
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">پزشک / اپراتور</span><select required value={operatorId} onChange={e=>setOperatorId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">انتخاب</option>{operators.filter(o=>o.active).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">تاریخ نوبت (شمسی)</span><input required value={procedureDate} onChange={e=>setProcedureDate(e.target.value)} placeholder="۱۴۰۵/۰۸/۰۷" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">ساعت نوبت</span><input required type="time" value={procedureTime} onChange={e=>setProcedureTime(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">روش پرداخت بیعانه</span><select value={depositMethod} onChange={e=>setDepositMethod(e.target.value as PaymentMethod)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">{Object.entries(paymentLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">کل هزینه فاکتور (تومان)</span><input required type="number" min="1" value={totalToman} onChange={e=>setTotalToman(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>
            <label className="space-y-1 text-xs"><span className="block font-semibold text-slate-700">مبلغ بیعانه (تومان)</span><input required type="number" min="1" value={depositToman} onChange={e=>setDepositToman(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>
            <label className="space-y-1 text-xs md:col-span-2 xl:col-span-1"><span className="block font-semibold text-slate-700">توضیحات (اختیاری)</span><input value={depositNotes} onChange={e=>setDepositNotes(e.target.value)} placeholder="مثلاً بیعانه جراحی..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>
          </div>
          <div className="flex gap-2"><button type="submit" className="rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-700">ثبت نوبت و بیعانه</button><button type="button" onClick={resetDepositForm} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600">انصراف</button></div>
        </form>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            ['active', 'فاکتورهای فعال', activeAdmissions.filter(a=>!a.deposit || a.deposit.status!=='reserved').length],
            ['voided', 'فاکتورهای ابطال‌شده', voidedAdmissions.length],
            ['deposits', 'بیعانه‌ها و نوبت عمل', pendingDeposits.length],
          ] as [ViewTab,string,number][]).map(([key,label,count]) => <button key={key} onClick={()=>setTab(key)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab===key?'bg-sky-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label} <span className="mr-1 opacity-80">{count}</span></button>)}
        </div>
        <div className="relative w-full sm:max-w-sm"><Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو نام، تلفن، شماره فاکتور یا خدمت..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-9 pl-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100" /></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {filtered.length===0 ? <div className="py-14 text-center text-sm text-slate-400"><FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />موردی برای نمایش وجود ندارد.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-right text-xs">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500"><th className="px-4 py-3">شماره</th><th className="px-4 py-3">بیمار / خدمت</th><th className="px-4 py-3">تاریخ</th><th className="px-4 py-3">مبلغ کل</th><th className="px-4 py-3">پرداخت‌شده</th><th className="px-4 py-3">مانده</th><th className="px-4 py-3">وضعیت / عملیات</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => <tr key={a.id} className="align-top hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">{a.admissionNumber}</td>
                <td className="px-4 py-3"><div className="font-bold text-slate-900">{a.patientName}</div><div className="mt-1 text-slate-500">{a.serviceName}</div><div className="mt-1 text-slate-400">{a.patientPhone}</div>{a.deposit && <div className="mt-1 text-amber-700">بیعانه: {formatToman(a.deposit.amount)} تومان</div>}{a.status==='cancelled' && <div className="mt-1 text-rose-700">دلیل ابطال: {a.voidReason || 'ثبت نشده'}</div>}</td>
                <td className="whitespace-nowrap px-4 py-3">{a.deposit?.scheduledDate || a.date}{a.deposit?.scheduledTime && <div className="mt-1 text-slate-400">{a.deposit.scheduledTime}</div>}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">{formatToman(a.finalAmount)} تومان</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-emerald-700">{formatToman(a.paidAmount)} تومان</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-amber-700">{formatToman(a.debtAmount)} تومان</td>
                <td className="min-w-[190px] px-4 py-3"><div className="mb-2 flex items-center gap-1.5">{a.status==='cancelled'?<><Ban className="h-3.5 w-3.5 text-rose-600" /><span className="font-bold text-rose-700">ابطال‌شده</span></>:a.deposit?.status==='reserved'?<><Clock3 className="h-3.5 w-3.5 text-amber-600" /><span className="font-bold text-amber-700">منتظر انجام عمل</span></>:a.deposit?.status==='completed'?<><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><span className="font-bold text-emerald-700">عمل انجام و تسویه شد</span></>:<span className="font-semibold text-slate-600">فعال</span>}</div>
                  <div className="flex flex-wrap gap-1.5">{a.status!=='cancelled' && <button onClick={()=>onPrintAdmission(a)} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">چاپ فاکتور</button>}{a.status!=='cancelled' && (!a.deposit || a.deposit.status!=='reserved') && <button onClick={()=>voidInvoice(a)} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100">ابطال فاکتور</button>}{a.deposit?.status==='reserved' && a.status!=='cancelled' && <button onClick={()=>voidInvoice(a)} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100">لغو نوبت / ابطال</button>}</div>
                  {tab==='deposits' && a.deposit?.status==='reserved' && a.status!=='cancelled' && <div className="mt-3 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"><div className="text-[10px] leading-5 text-slate-600">مانده قابل دریافت: <strong className="text-emerald-800">{formatToman(Math.max(0,a.finalAmount-(a.deposit.amount||0)))} تومان</strong></div><input type="number" min="0" placeholder={String(Math.round(Math.max(0,a.finalAmount-(a.deposit.amount||0))/10))} value={balanceAmounts[a.id]??''} onChange={e=>setBalanceAmounts(prev=>({...prev,[a.id]:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" /><select value={balanceMethods[a.id]||'pos'} onChange={e=>setBalanceMethods(prev=>({...prev,[a.id]:e.target.value as PaymentMethod}))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">{Object.entries(paymentLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button onClick={()=>completeDeposit(a)} className="w-full rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-bold text-white hover:bg-emerald-700"><CheckCircle2 className="ml-1 inline h-3.5 w-3.5" /> دریافت مانده و تسویه فاکتور</button></div>}
                </td>
              </tr>)}
            </tbody>
          </table></div>
        )}
      </div>
      <p className="text-[11px] leading-6 text-slate-400">فاکتور ابطال‌شده حذف نمی‌شود. بیعانه در مبلغ پرداخت‌شده همان فاکتور ثبت می‌ماند و با دریافت مانده، مبلغ کل فاکتور فقط یک‌بار در گزارش درآمد محاسبه می‌شود.</p>
    </div>
  );
};
