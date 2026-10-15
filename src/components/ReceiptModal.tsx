import React, { useEffect } from 'react';
import { X, Printer, CheckCircle2, Clock, Calendar, FileText, Phone, MapPin, AlertCircle, ShieldCheck } from 'lucide-react';
import { Admission, ClinicSettings } from '../types';
import { formatToman, formatPersianDateReadable, numberToPersianWords } from '../utils/persianDate';

interface ReceiptModalProps {
  admission: Admission | null;
  settings: ClinicSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ admission, settings, onClose }) => {
  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!admission) return null;

  const handlePrint = () => {
    window.print();
  };

  const paymentLabels: Record<string, string> = {
    pos: 'کارتخوان بانکی (POS)',
    card_to_card: 'کارت به کارت',
    cash: 'پرداخت نقدی',
    cheque: 'چک صیادی',
  };

  // Format admission time
  const admissionTime = admission.timestamp
    ? new Date(admission.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  // Current print generation timestamp
  const nowPersianTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  // Calculate gross total
  const consumablesTotal = (admission.consumables || []).reduce((acc, c) => acc + (c.cost || 0), 0);
  const baseServiceTotal = (admission.basePrice || 0) * (admission.quantity || 1);
  const grossTotal = baseServiceTotal + consumablesTotal;
  const isSettled = admission.debtAmount === 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto receipt-modal-backdrop">
      {/* Top Floating Action Bar (Hidden in Print) */}
      <div className="w-full max-w-[210mm] bg-slate-900 text-white rounded-xl shadow-xl px-4 py-3 mb-3 flex items-center justify-between no-print border border-slate-700/80 sticky top-2 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-600/30 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100">قبض و صورت‌حساب رسمی پذیرش</h3>
              <span className="bg-sky-500/20 text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-sky-400/30">
                قالب رسمی A4
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              شماره قبض: <span className="font-mono text-slate-200">{admission.admissionNumber}</span> · مراجع: <span className="text-slate-200 font-medium">{admission.patientName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            title="چاپ فیش (Ctrl + P)"
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-sky-600/30 active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ فیش</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="بستن پنجره (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable A4 Document Sheet */}
      <div className="receipt-modal-card w-full max-w-[210mm] flex justify-center pb-8">
        <div className="receipt-a4-sheet bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-300 w-full min-h-[297mm] p-6 sm:p-8 flex flex-col justify-between box-border">
          
          {/* Main Body with outer formal decorative border */}
          <div className="border-2 border-slate-800 rounded-sm p-4 sm:p-5 flex-1 flex flex-col justify-between">
            <div>
              {/* Official Clinic Header */}
              <div className="border-b-2 border-slate-800 pb-3 mb-3">
                <div className="flex items-start justify-between gap-4">
                  
                  {/* Right Header: Clinic Branding & Physician */}
                  <div className="w-[34%] text-right space-y-1">
                    <p className="text-[11px] text-slate-500 font-semibold">« بسمه تعالی »</p>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                      {settings.clinicName}
                    </h1>
                    <p className="text-xs text-slate-700 font-bold">
                      {settings.doctorName}
                    </p>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                      <span>تلفن تماس:</span>
                      <span className="font-semibold">{settings.phone}</span>
                    </p>
                  </div>

                  {/* Center Header: Official Document Title */}
                  <div className="w-[32%] text-center flex flex-col items-center justify-center pt-1">
                    <div className="w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center mb-1 text-slate-800">
                      <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                      صورت‌حساب و برگ پذیرش رسمی
                    </h2>
                    <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                      خدمات تخصصی درمانی، مراقبتی و زیبایی
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-300">
                      نسخه معتبر مراجع و صندوق
                    </span>
                  </div>

                  {/* Left Header: Invoice Meta Table */}
                  <div className="w-[34%] text-left flex justify-end">
                    <table className="receipt-print-table text-[11px] border border-slate-800 text-right w-full max-w-[200px]">
                      <tbody>
                        <tr className="border-b border-slate-800">
                          <td className="bg-slate-100 font-bold p-1 text-slate-700 w-1/2">شماره قبض:</td>
                          <td className="p-1 font-mono font-bold text-slate-900 text-left">{admission.admissionNumber}</td>
                        </tr>
                        <tr className="border-b border-slate-800">
                          <td className="bg-slate-100 font-bold p-1 text-slate-700">تاریخ پذیرش:</td>
                          <td className="p-1 font-mono text-slate-900 text-left">{admission.date}</td>
                        </tr>
                        <tr className="border-b border-slate-800">
                          <td className="bg-slate-100 font-bold p-1 text-slate-700">ساعت ثبت:</td>
                          <td className="p-1 font-mono text-slate-900 text-left">{admissionTime}</td>
                        </tr>
                        <tr>
                          <td className="bg-slate-100 font-bold p-1 text-slate-700">وضعیت مالی:</td>
                          <td className="p-1 font-bold text-left">
                            {isSettled ? (
                              <span className="text-emerald-700">تسویه کامل ✓</span>
                            ) : (
                              <span className="text-rose-700">مانده بدهی</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

              {/* Table 1: Patient and Admission Information */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-3.5 bg-slate-800 rounded-xs"></span>
                  <h3 className="text-xs font-bold text-slate-900">۱. مشخصات مراجع و اطلاعات پرونده</h3>
                </div>
                <table className="w-full receipt-print-table text-xs border border-slate-800 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-800">
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800 w-[16%]">نام و نام خانوادگی:</td>
                      <td className="p-1.5 font-bold text-slate-900 w-[34%]">{admission.patientName}</td>
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800 w-[16%]">کد ملی مراجع:</td>
                      <td className="p-1.5 font-mono tabular-nums text-slate-900 w-[34%]">{admission.patientNationalId || 'ثبت نشده'}</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800">شماره تلفن همراه:</td>
                      <td className="p-1.5 font-mono tabular-nums text-slate-900">{admission.patientPhone}</td>
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800">پزشک / اپراتور معالج:</td>
                      <td className="p-1.5 font-semibold text-slate-900">{admission.operatorName}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800">شناسه پرونده:</td>
                      <td className="p-1.5 font-mono text-slate-700">{admission.patientId}</td>
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800">نحوه پرداخت انتخابی:</td>
                      <td className="p-1.5 font-medium text-slate-900">
                        {admission.paymentMethods && admission.paymentMethods.length > 0
                          ? admission.paymentMethods.map((m) => paymentLabels[m] || m).join(' + ')
                          : paymentLabels[admission.paymentMethod] || admission.paymentMethod}
                      </td>
                    </tr>
                    {admission.paymentNotes && (
                      <tr className="border-t border-slate-300">
                        <td className="bg-amber-100/70 font-bold p-1.5 text-amber-900">توضیحات نحوه پرداخت:</td>
                        <td colSpan={3} className="p-1.5 text-slate-800 font-medium text-[11px] leading-relaxed bg-amber-50/30">
                          {admission.paymentNotes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table 2: Itemized Services & Clinical Procedures */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-3.5 bg-slate-800 rounded-xs"></span>
                  <h3 className="text-xs font-bold text-slate-900">۲. شرح خدمات تخصصی، جزئیات بالینی و تعرفه‌ها</h3>
                </div>
                <table className="w-full receipt-print-table text-xs border border-slate-800 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-800">
                      <th className="p-1.5 text-center w-[6%]">ردیف</th>
                      <th className="p-1.5 text-right w-[44%]">شرح خدمت / اقدام درمانی و جزئیات بالینی</th>
                      <th className="p-1.5 text-center w-[10%]">تعداد</th>
                      <th className="p-1.5 text-left w-[13%]">تعرفه مصوب</th>
                      <th className="p-1.5 text-left w-[12%]">تخفیف</th>
                      <th className="p-1.5 text-left w-[15%]">مبلغ نهایی (ریال)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Primary Service Row */}
                    <tr className="border-b border-slate-800">
                      <td className="p-1.5 text-center font-bold font-mono">۱</td>
                      <td className="p-1.5">
                        <div className="font-bold text-slate-900 text-xs">{admission.serviceName}</div>
                        {/* Clinical Sub-details */}
                        <div className="space-y-0.5 mt-0.5 text-[11px] text-slate-600">
                          {admission.details.laserAreas && admission.details.laserAreas.length > 0 && (
                            <p>
                              • نواحی لیزر: <span className="font-medium text-slate-800">{admission.details.laserAreas.join('، ')}</span>
                              {admission.details.sessionNumber && (
                                <span> · جلسه {admission.details.sessionNumber} {admission.details.totalSessions ? `از پکیج ${admission.details.totalSessions} جلسه‌ای` : ''}</span>
                              )}
                            </p>
                          )}
                          {admission.details.injectionSites && admission.details.injectionSites.length > 0 && (
                            <p>
                              • محل‌های تزریق: <span className="font-medium text-slate-800">{admission.details.injectionSites.join('، ')}</span>
                            </p>
                          )}
                          {admission.details.surgeryType && (
                            <p>
                              • نوع عمل جراحی: <span className="font-medium text-slate-800">{admission.details.surgeryType}</span>
                            </p>
                          )}
                          {admission.details.mesoType && (
                            <p>
                              • نوع ماده / کوکتل مزو: <span className="font-medium text-slate-800">{admission.details.mesoType}</span>
                            </p>
                          )}
                          {admission.details.notes && (
                            <p className="text-slate-500 italic">
                              • توضیحات: {admission.details.notes}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-1.5 text-center font-mono font-medium">{admission.quantity || 1}</td>
                      <td className="p-1.5 text-left font-mono tabular-nums">{formatToman(admission.basePrice)}</td>
                      <td className="p-1.5 text-left font-mono tabular-nums text-rose-700">
                        {admission.discount > 0 ? formatToman(admission.discount) : '۰'}
                      </td>
                      <td className="p-1.5 text-left font-mono font-bold tabular-nums">
                        {formatToman((admission.basePrice * (admission.quantity || 1)) - admission.discount)}
                      </td>
                    </tr>

                    {/* Consumables Rows (if any) */}
                    {admission.consumables && admission.consumables.length > 0 && (
                      admission.consumables.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-800 bg-slate-50/50">
                          <td className="p-1.5 text-center font-bold font-mono">{idx + 2}</td>
                          <td className="p-1.5">
                            <span className="font-medium text-slate-800">اقلام و مواد مصرفی: {c.name}</span>
                          </td>
                          <td className="p-1.5 text-center font-mono">۱</td>
                          <td className="p-1.5 text-left font-mono tabular-nums">
                            {c.cost > 0 ? formatToman(c.cost) : 'رایگان'}
                          </td>
                          <td className="p-1.5 text-left font-mono tabular-nums text-slate-400">۰</td>
                          <td className="p-1.5 text-left font-mono font-bold tabular-nums">
                            {c.cost > 0 ? formatToman(c.cost) : 'رایگان'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table 3: Financial Settlement & Accounting Breakdown */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-3.5 bg-slate-800 rounded-xs"></span>
                  <h3 className="text-xs font-bold text-slate-900">۳. خلاصه محاسبات حسابداری و وضعیت تسویه مالی</h3>
                </div>
                <table className="w-full receipt-print-table text-xs border border-slate-800 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-800">
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800 w-[18%]">جمع کل ناخالص:</td>
                      <td className="p-1.5 font-mono tabular-nums text-left w-[32%]">{formatToman(grossTotal)}</td>
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800 w-[18%]">تخفیف اعمال‌شده:</td>
                      <td className="p-1.5 font-mono tabular-nums text-left text-rose-700 w-[32%]">
                        {admission.discount > 0 ? `- ${formatToman(admission.discount)}` : '۰ ریال'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-800 bg-slate-50">
                      <td className="bg-slate-200/80 font-black p-2 text-slate-900 text-xs">مبلغ نهایی قابل پرداخت:</td>
                      <td className="p-2 font-black font-mono tabular-nums text-left text-sm text-slate-900">
                        {formatToman(admission.finalAmount)}
                      </td>
                      <td className="bg-slate-200/80 font-bold p-2 text-slate-900">مبلغ نهایی به حروف:</td>
                      <td className="p-2 font-bold text-slate-800 text-[11px] leading-relaxed">
                        {numberToPersianWords(admission.finalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 font-bold p-1.5 text-emerald-800">مبلغ واریزی / پرداختی:</td>
                      <td className="p-1.5 font-mono font-bold tabular-nums text-left text-emerald-700">
                        {formatToman(admission.paidAmount)}
                        <span className="text-[10px] font-normal text-slate-500 mr-1.5">
                          ({admission.paymentMethods && admission.paymentMethods.length > 0
                            ? admission.paymentMethods.map((m) => paymentLabels[m] || m).join(' + ')
                            : paymentLabels[admission.paymentMethod] || admission.paymentMethod})
                        </span>
                      </td>
                      <td className="bg-slate-100 font-bold p-1.5 text-slate-800">وضعیت مانده بدهی:</td>
                      <td className="p-1.5 font-mono font-bold tabular-nums text-left">
                        {admission.debtAmount > 0 ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {formatToman(admission.debtAmount)} (بدهکار)
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ۰ ریال (تسویه کامل)
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table 4: Cheque details if applicable */}
              {(admission.paymentMethod === 'cheque' || admission.paymentMethods?.includes('cheque')) && admission.chequeDetails && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-3.5 bg-amber-600 rounded-xs"></span>
                    <h3 className="text-xs font-bold text-amber-900">مشخصات سند تجاری (چک صیادی)</h3>
                  </div>
                  <table className="w-full receipt-print-table text-xs border border-amber-600 border-collapse bg-amber-50/40">
                    <tbody>
                      <tr className="border-b border-amber-600">
                        <td className="bg-amber-100/70 font-bold p-1.5 text-amber-900 w-[18%]">شماره چک صیادی:</td>
                        <td className="p-1.5 font-mono font-bold text-amber-950 w-[32%]">{admission.chequeDetails.chequeNumber}</td>
                        <td className="bg-amber-100/70 font-bold p-1.5 text-amber-900 w-[18%]">بانک و شعبه صادرکننده:</td>
                        <td className="p-1.5 font-medium text-amber-950 w-[32%]">{admission.chequeDetails.bankName}</td>
                      </tr>
                      <tr>
                        <td className="bg-amber-100/70 font-bold p-1.5 text-amber-900">نام صادرکننده:</td>
                        <td className="p-1.5 font-medium text-amber-950">{admission.chequeDetails.issuer || admission.patientName}</td>
                        <td className="bg-amber-100/70 font-bold p-1.5 text-amber-900">تاریخ سررسید:</td>
                        <td className="p-1.5 font-bold font-mono text-amber-950">{formatPersianDateReadable(admission.chequeDetails.dueDate)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section 5: Follow-up Appointment & Post-Care Instructions */}
              {admission.followUpDate && (
                <div className="mb-3">
                  <table className="w-full receipt-print-table text-xs border border-sky-700 border-collapse bg-sky-50/30">
                    <tbody>
                      <tr>
                        <td className="bg-sky-100/70 font-bold p-2 text-sky-900 w-[22%] align-middle">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-sky-700" />
                            <span>نوبت مراجعه بعدی:</span>
                          </div>
                        </td>
                        <td className="p-2 font-bold text-sky-950 w-[28%] align-middle font-mono">
                          {formatPersianDateReadable(admission.followUpDate)}
                        </td>
                        <td className="bg-sky-100/70 font-bold p-2 text-sky-900 w-[15%] align-middle">
                          علت مراجعه:
                        </td>
                        <td className="p-2 text-sky-900 w-[35%] align-middle text-[11px]">
                          {admission.followUpReason || 'ادامه دوره درمان و چکاپ پزشکی'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Section: Official Signatures, Stamps, and Legal Terms */}
            <div>
              {/* Signatures & Seal Table */}
              <div className="mt-2 mb-3">
                <table className="w-full receipt-print-table text-xs border border-slate-800 border-collapse">
                  <tbody>
                    <tr className="h-24">
                      {/* Patient Signature */}
                      <td className="w-1/3 p-2 text-center align-top border-l border-slate-800">
                        <p className="font-bold text-slate-800 text-[11px]">امضا و تأیید مراجع / بیمار</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          صحت خدمات دریافتی و تحویل برگه رسید مورد تأیید است.
                        </p>
                        <div className="h-10 mt-2"></div>
                      </td>

                      {/* Cashier / Receptionist Stamp */}
                      <td className="w-1/3 p-2 text-center align-top border-l border-slate-800 relative">
                        <p className="font-bold text-slate-800 text-[11px]">مهر و امضای پذیرش و صندوق</p>
                        <p className="text-[10px] text-slate-500 mt-1">امور مالی و ثبت پذیرش کلینیک</p>
                        <div className="h-11 flex items-center justify-center mt-1">
                          {isSettled ? (
                            <div className="border-2 border-emerald-600 text-emerald-700 rounded px-3 py-1 text-xs font-black rotate-[-2deg]">
                              ✓ تسویه حساب کامل گردید
                            </div>
                          ) : (
                            <div className="border-2 border-rose-600 text-rose-700 rounded px-2.5 py-1 text-xs font-bold">
                              دارای مانده بدهی
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Doctor Signature */}
                      <td className="w-1/3 p-2 text-center align-top">
                        <p className="font-bold text-slate-800 text-[11px]">مهر و امضای پزشک معالج</p>
                        <p className="text-[10px] text-slate-700 font-semibold mt-1">{settings.doctorName}</p>
                        <div className="h-10 mt-2"></div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Official Clinic Footer */}
              <div className="border-t border-dashed border-slate-400 pt-2 text-center text-[10.5px] text-slate-600 space-y-1">
                <p className="font-medium text-slate-800">
                  {settings.receiptFooter}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-600 text-[10px]">
                  <span>نشانی: {settings.address}</span>
                  <span>تلفن تماس: {settings.phone}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-200">
                  <span>سیستم یکپارچه مدیریت مطب و پذیرش کلینیک</span>
                  <span>تاریخ و ساعت چاپ سند: {admission.date} - ساعت {nowPersianTime}</span>
                  <span>قطع سند: A4 استاندارد (نسخه چاپی)</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
