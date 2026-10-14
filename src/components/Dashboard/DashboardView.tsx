import React, { useState, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Receipt,
  Printer,
  ChevronLeft,
  Sparkles,
  PhoneCall,
  UserPlus,
  FolderHeart,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { Admission, FollowUpReminder, Patient, Operator } from '../../types';
import {
  formatPersianDateReadable,
  getTodayPersianDate
} from '../../utils/persianDate';
import { EditAdmissionModal } from '../Admission/EditAdmissionModal';

interface DashboardViewProps {
  admissions: Admission[];
  followUps: FollowUpReminder[];
  patients: Patient[];
  operators?: Operator[];
  onOpenReceptionForPatient: (patientId?: string) => void;
  onOpenPatientDossier: (patientId: string) => void;
  onPrintAdmission: (admission: Admission) => void;
  onUpdateAdmission?: (updated: Admission) => void;
  onNavigateToFollowUps: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  admissions,
  followUps,
  patients,
  operators = [],
  onOpenReceptionForPatient,
  onOpenPatientDossier,
  onPrintAdmission,
  onUpdateAdmission,
  onNavigateToFollowUps,
}) => {
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null);
  const today = getTodayPersianDate();

  // Reception operational metrics (بدون مبالغ مالی و درآمد وصولی منشی)
  const todayAdmissions = useMemo(() => {
    return admissions.filter((a) => a.date === today);
  }, [admissions, today]);

  const upcomingFollowUps = useMemo(() => {
    return followUps
      .filter((f) => f.status === 'pending' || f.status === 'overdue')
      .slice(0, 6);
  }, [followUps]);

  const todayFollowUpsCount = useMemo(() => {
    return followUps.filter((f) => f.scheduledDate === today && f.status === 'pending').length;
  }, [followUps, today]);

  // Breakdown of today's admissions by the 3 main clinic departments
  const todayBeautyCount = useMemo(() => {
    return todayAdmissions.filter((a) => a.serviceCategory !== 'laser_women' && a.serviceCategory !== 'laser_men').length;
  }, [todayAdmissions]);

  const todayLaserWomenCount = useMemo(() => {
    return todayAdmissions.filter((a) => a.serviceCategory === 'laser_women').length;
  }, [todayAdmissions]);

  const todayLaserMenCount = useMemo(() => {
    return todayAdmissions.filter((a) => a.serviceCategory === 'laser_men').length;
  }, [todayAdmissions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Reception Key Operational Indicators Grid (بدون نمایش مبالغ مالی) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">بیماران امروز</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {todayAdmissions.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">نفر ویزیت و پذیرش‌شده</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">پذیرش‌های ثبت‌شده</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {todayAdmissions.length}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">پرونده فعال در نوبت امروز</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">نوبت‌های پیگیری موعد امروز</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
              {todayFollowUpsCount}
            </div>
            <p className="text-[11px] text-indigo-500 font-medium mt-1">یادآوری و تماس‌های موعد امروز</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">کل بیماران مطب</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <FolderHeart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {patients.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">پرونده پزشکی در بایگانی</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">پیگیری‌های منتظر تماس</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
              {upcomingFollowUps.length}
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">نیاز به تماس و هماهنگی منشی</p>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Today Admissions Table & Upcoming Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Admissions (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <h3 className="font-bold text-slate-800 text-sm">پذیرش‌های امروز مطب</h3>
                <span className="text-xs text-slate-400">({todayAdmissions.length} مورد)</span>
              </div>
              <button
                onClick={() => onOpenReceptionForPatient()}
                className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>+ ثبت پذیرش جدید</span>
              </button>
            </div>

            {todayAdmissions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-medium">امروز هنوز پذیرشی ثبت نشده است</p>
                <button
                  onClick={() => onOpenReceptionForPatient()}
                  className="mt-3 px-3 py-1.5 text-xs text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer"
                >
                  اولین پذیرش امروز را ثبت کنید
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="py-2.5 font-medium">بیمار</th>
                      <th className="py-2.5 font-medium">خدمت درمانی</th>
                      <th className="py-2.5 font-medium">اپراتور / پزشک</th>
                      <th className="py-2.5 font-medium text-center">وضعیت صندوق</th>
                      <th className="py-2.5 font-medium text-center">چاپ فیش A4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {todayAdmissions.map((adm) => (
                      <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3">
                          <button
                            onClick={() => onOpenPatientDossier(adm.patientId)}
                            className="font-bold text-slate-900 hover:text-sky-600 transition-colors cursor-pointer"
                          >
                            {adm.patientName}
                          </button>
                          <span className="block text-[11px] text-slate-400 font-mono">
                            {adm.patientPhone}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-medium text-slate-800">{adm.serviceName}</span>
                          {adm.details.sessionNumber && (
                            <span className="block text-[11px] text-slate-400">
                              جلسه {adm.details.sessionNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-600">{adm.operatorName}</td>
                        <td className="py-3 text-center">
                          {adm.debtAmount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              مانده حساب
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              تسویه کامل
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onUpdateAdmission && (
                              <button
                                onClick={() => setEditingAdmission(adm)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors border border-sky-200 cursor-pointer text-[11px] font-medium"
                                title="ویرایش پذیرش، تعداد و مبلغ خدمت"
                              >
                                <Edit2 className="w-3 h-3 text-sky-600" />
                                <span>ویرایش</span>
                              </button>
                            )}
                            <button
                              onClick={() => onPrintAdmission(adm)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200 cursor-pointer text-[11px]"
                              title="چاپ فیش رسمی A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>چاپ فیش</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>مجموع پذیرش‌های انجام‌شده امروز:</span>
            <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
              {todayAdmissions.length} پرونده
            </span>
          </div>
        </div>

        {/* Upcoming Follow-ups (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <h3 className="font-bold text-slate-800 text-sm">مراجعات و پیگیری‌های نزدیک</h3>
              </div>
              <button
                onClick={onNavigateToFollowUps}
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>همه</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {upcomingFollowUps.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  مراجعه‌ای برای پیگیری وجود ندارد
                </div>
              ) : (
                upcomingFollowUps.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors bg-slate-50/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.patientName}</span>
                      <span className="font-mono tabular-nums text-[11px] text-indigo-700 font-medium">
                        {item.scheduledDate === today ? 'امروز' : formatPersianDateReadable(item.scheduledDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{item.serviceName}</span>
                      <span>{item.operatorName}</span>
                    </div>

                    {item.reason && (
                      <p className="text-[11px] text-slate-600 line-clamp-1">{item.reason}</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={`tel:${item.patientPhone}`}
                        className="text-[11px] text-slate-500 hover:text-sky-600 flex items-center gap-1 font-mono tabular-nums"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{item.patientPhone}</span>
                      </a>
                      <button
                        onClick={() => onOpenReceptionForPatient(item.patientId)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition-colors cursor-pointer"
                      >
                        ثبت پذیرش
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={onNavigateToFollowUps}
            className="w-full mt-4 py-2 text-center text-xs text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 rounded-xl font-medium transition-colors cursor-pointer"
          >
            مشاهده تقویم و لیست کامل یادآوری‌ها
          </button>
        </div>
      </div>

      {/* 3. Bottom Row: Reception Desk Workspace (جایگزین امن برای نمودار مالی منشی) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">میز کار و هماهنگی پذیرش مطب</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تفکیک مراجعات امروز بر اساس لاین‌های درمانی و دسترسی‌های سریع منشی
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">تاریخ جاری سیستم:</span>
            <span className="font-mono tabular-nums font-bold text-slate-700 text-xs bg-slate-100 px-2 py-1 rounded-lg">
              {today}
            </span>
          </div>
        </div>

        {/* 3 Department Breakdown Cards for Secretary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                ۱. خدمات زیبایی
              </span>
              <span className="font-mono tabular-nums font-bold text-purple-700 text-sm">
                {todayBeautyCount} پذیرش
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              تزریقات بوتاکس، فیلر، هایفوتراپی، مزوتراپی، جراحی‌های سرپایی و ویزیت‌های پزشک
            </p>
          </div>

          <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                ۲. خدمات لیزر بانوان
              </span>
              <span className="font-mono tabular-nums font-bold text-rose-700 text-sm">
                {todayLaserWomenCount} پذیرش
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              پکیج‌های توتال بادی VIP، فول‌بادی، کاربردی، اقتصادی و نواحی موضعی بانوان
            </p>
          </div>

          <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-sky-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                ۳. خدمات لیزر آقایان
              </span>
              <span className="font-mono tabular-nums font-bold text-sky-700 text-sm">
                {todayLaserMenCount} پذیرش
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              پکیج‌های توتال بادی، فول‌بادی، بالاتنه کامل، آنکارد ریش و نواحی موضعی آقایان
            </p>
          </div>
        </div>

        {/* Quick Operations Checklist */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>چاپ فیش استاندارد A4 پس از هر پذیرش</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>تنظیم هوشمند تاریخ مراجعه و پیگیری بعدی</span>
            </span>
          </div>

          <button
            onClick={() => onOpenReceptionForPatient()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>ثبت پذیرش جدید</span>
          </button>
        </div>
      </div>

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
