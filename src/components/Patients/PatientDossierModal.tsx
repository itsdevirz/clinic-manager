import React, { useState, useMemo } from 'react';
import {
  X,
  Edit2,
  Printer,
  ShieldAlert,
  UserCheck,
  FileText,
  CreditCard
} from 'lucide-react';
import { Patient, Admission, FollowUpReminder, Operator } from '../../types';
import {
  formatToman,
  formatPersianDateReadable
} from '../../utils/persianDate';
import { EditAdmissionModal } from '../Admission/EditAdmissionModal';
import { EditPatientModal } from './EditPatientModal';

const PAYMENT_LABELS: Record<string, string> = {
  pos: 'کارتخوان (POS)',
  card_to_card: 'کارت به کارت',
  cash: 'وجه نقد',
  cheque: 'چک صیادی',
};

interface PatientDossierModalProps {
  patientId: string | null;
  onClose: () => void;
  patients: Patient[];
  admissions: Admission[];
  followUps: FollowUpReminder[];
  operators?: Operator[];
  onOpenReceptionForPatient: (patientId: string) => void;
  onUpdatePatient: (updated: Patient) => void;
  onPrintAdmission: (admission: Admission) => void;
  onUpdateAdmission?: (updated: Admission) => void;
}

export const PatientDossierModal: React.FC<PatientDossierModalProps> = ({
  patientId,
  onClose,
  patients,
  admissions,
  followUps,
  operators = [],
  onOpenReceptionForPatient,
  onUpdatePatient,
  onPrintAdmission,
  onUpdateAdmission,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'timeline' | 'sessions' | 'followup'>('info');
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null);
  const [isEditingPatient, setIsEditingPatient] = useState(false);

  // Inline editing state for medical record
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [editHistory, setEditHistory] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const patient = useMemo(() => {
    if (!patientId) return null;
    return patients.find((p) => p.id === patientId) || null;
  }, [patients, patientId]);

  const patientAdmissions = useMemo(() => {
    if (!patient) return [];
    return admissions
      .filter((a) => a.patientId === patient.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [admissions, patient]);

  const totalDebt = useMemo(() => {
    return patientAdmissions.reduce((sum, a) => sum + (a.debtAmount || 0), 0);
  }, [patientAdmissions]);

  if (!patient) return null;

  const handleStartEditMedical = () => {
    setEditHistory(patient.medicalHistory || '');
    setEditAllergies(patient.allergies || '');
    setEditNotes(patient.notes || '');
    setIsEditingMedical(true);
  };

  const handleSaveMedical = () => {
    const updated: Patient = {
      ...patient,
      medicalHistory: editHistory,
      allergies: editAllergies,
      notes: editNotes,
    };
    onUpdatePatient(updated);
    setIsEditingMedical(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title="بستن پرونده"
          aria-label="بستن پرونده"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Dossier Header */}
        <div className="p-5 pr-14 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-sky-700 font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
              {patient.gender === 'female' ? 'خانم' : 'آقا'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  {patient.firstName} {patient.lastName}
                </h3>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  (پرونده: {patient.id})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span>کد ملی: <span className="font-mono tabular-nums text-slate-700">{patient.nationalId || 'ثبت نشده'}</span></span>
                <span aria-hidden="true">·</span>
                <span>تماس: <span className="font-mono tabular-nums text-slate-700">{patient.phone}</span></span>
                <span aria-hidden="true">·</span>
                <span>سن: <span className="font-mono tabular-nums">{patient.age} سال</span></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingPatient(true)}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="اصلاح مشخصات پرونده"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>اصلاح پرونده</span>
            </button>
            <button
              onClick={() => {
                onOpenReceptionForPatient(patient.id);
                onClose();
              }}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              + پذیرش برای این بیمار
            </button>
          </div>
        </div>

        {/* Total Debt & Summary Ribbon */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>تعداد کل پذیرش‌ها: <strong className="font-mono tabular-nums">{patientAdmissions.length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>تاریخ تشکیل پرونده: <span className="font-mono tabular-nums">{formatPersianDateReadable(patient.createdAt)}</span></span>
          </div>
          <div>
            {totalDebt > 0 ? (
              <span className="text-rose-600 font-bold">
                مانده بدهی کل: {formatToman(totalDebt)}
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">وضعیت حساب: کاملاً تسویه شده</span>
            )}
          </div>
        </div>

        {/* Dossier Tabs Navigation */}
        <div className="px-5 pt-3 border-b border-slate-100 flex items-center gap-2 text-xs overflow-x-auto">
          {[
            { id: 'info', label: 'اطلاعات هویتی' },
            { id: 'medical', label: 'سابقه و هشدارهای پزشکی' },
            { id: 'timeline', label: `تاریخچه خدمات (${patientAdmissions.length})` },
            { id: 'sessions', label: 'وضعیت جلسات درمانی' },
            { id: 'followup', label: 'مراجعات بعدی' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-2 font-medium border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dossier Tabs Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Tab 1: Info */}
          {activeTab === 'info' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">اطلاعات هویتی و ارتباطی بیمار</h4>
                  <p className="text-[11px] text-slate-400">مشخصات اصلی، کد ملی، شماره تماس و اطلاعات فردی</p>
                </div>
                <button
                  onClick={() => setIsEditingPatient(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-medium border border-amber-200/80 transition-colors cursor-pointer text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>اصلاح و ویرایش مشخصات</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">نام و نام خانوادگی:</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {patient.firstName} {patient.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">کد ملی:</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {patient.nationalId || 'ثبت نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">شماره تماس همراه:</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {patient.phone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">سن و جنسیت:</span>
                  <span className="text-slate-800">
                    {patient.age ? `${patient.age} سال` : 'ثبت نشده'} ({patient.gender === 'female' ? 'خانم' : 'آقا'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">شغل / حرفه:</span>
                  <span className="text-slate-800">{patient.job || 'ثبت نشده'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">آدرس محل سکونت:</span>
                  <span className="text-slate-800">{patient.address || 'ثبت نشده'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Medical History */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              {!isEditingMedical ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">اطلاعات پزشکی ثبت‌شده</span>
                    <button
                      onClick={handleStartEditMedical}
                      className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>ویرایش پرونده پزشکی</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div>
                      <span className="text-slate-500 font-medium block">سابقه بیماری خاص / زمینه‌ای:</span>
                      <p className="text-slate-900 mt-0.5">{patient.medicalHistory || 'موردی ثبت نشده است'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">حساسیت دارویی و پوستی:</span>
                      <p className="text-slate-900 mt-0.5">{patient.allergies || 'موردی ثبت نشده است'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">یادداشت پزشک / توصیه‌های تکمیلی:</span>
                      <p className="text-slate-900 mt-0.5">{patient.notes || 'موردی ثبت نشده است'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 bg-sky-50/50 rounded-2xl border border-sky-100">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">سابقه بیماری خاص:</label>
                    <input
                      type="text"
                      value={editHistory}
                      onChange={(e) => setEditHistory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">حساسیت دارویی و پوستی:</label>
                    <input
                      type="text"
                      value={editAllergies}
                      onChange={(e) => setEditAllergies(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">یادداشت و توصیه پزشکی:</label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingMedical(false)}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-700"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveMedical}
                      className="px-4 py-1.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700"
                    >
                      ذخیره تغییرات
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Timeline of Services */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {patientAdmissions.length === 0 ? (
                <p className="text-center py-8 text-slate-400">تاکنون خدمتی برای این بیمار ثبت نشده است</p>
              ) : (
                <div className="relative border-r-2 border-slate-200 pr-4 space-y-4">
                  {patientAdmissions.map((adm) => (
                    <div key={adm.id} className="relative">
                      {/* Dot on timeline */}
                      <div className="absolute -right-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-sky-500 ring-4 ring-white" />

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {adm.serviceName}
                          </span>
                          <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                            {formatPersianDateReadable(adm.date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 text-[11px]">
                          <span>اپراتور: <strong>{adm.operatorName}</strong></span>
                          <span className="font-mono tabular-nums">قبض: {adm.admissionNumber}</span>
                        </div>

                        {/* Service Details */}
                        {adm.details.laserAreas && adm.details.laserAreas.length > 0 && (
                          <p className="text-[11px] text-slate-500">
                            نواحی لیزر: {adm.details.laserAreas.join('، ')} (جلسه {adm.details.sessionNumber})
                          </p>
                        )}
                        {adm.details.injectionSites && adm.details.injectionSites.length > 0 && (
                          <p className="text-[11px] text-slate-500">
                            محل تزریق: {adm.details.injectionSites.join('، ')}
                          </p>
                        )}

                        {/* Financial & Payment Details */}
                        <div className="pt-2 border-t border-slate-200/60 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-700">روش پرداخت:</span>
                              <span className="bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded-md">
                                {adm.paymentMethods && adm.paymentMethods.length > 0
                                  ? adm.paymentMethods.map((m) => PAYMENT_LABELS[m] || m).join(' + ')
                                  : PAYMENT_LABELS[adm.paymentMethod] || adm.paymentMethod}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {onUpdateAdmission && (
                                <button
                                  onClick={() => setEditingAdmission(adm)}
                                  className="flex items-center gap-1 text-[11px] text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded-md transition-colors cursor-pointer font-medium"
                                  title="ویرایش پذیرش، تعداد و مبلغ"
                                >
                                  <Edit2 className="w-3 h-3 text-sky-600" />
                                  <span>ویرایش</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  onClose();
                                  onPrintAdmission(adm);
                                }}
                                className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded-md cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>چاپ فیش</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-3 font-mono tabular-nums">
                              <span>مبلغ کل: {formatToman(adm.finalAmount)}</span>
                              <span className="text-emerald-700 font-bold">پرداختی: {formatToman(adm.paidAmount)}</span>
                              {adm.debtAmount > 0 && (
                                <span className="text-rose-600 font-bold">بدهی: {formatToman(adm.debtAmount)}</span>
                              )}
                            </div>
                          </div>

                          {/* Payment Notes Recorded in Dossier */}
                          {adm.paymentNotes && (
                            <div className="p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
                              <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-bold text-[11px] text-amber-900 block">
                                  توضیحات نحوه پرداخت:
                                </span>
                                <p className="text-slate-800 leading-relaxed font-medium text-[11px]">
                                  {adm.paymentNotes}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Treatment Sessions Tracker */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <p className="text-slate-500">
                روند جلسات انجام‌شده در مقایسه با جلسات باقیمانده پکیج‌های درمانی:
              </p>
              {patientAdmissions.filter((a) => a.details.sessionNumber).length === 0 ? (
                <p className="text-center py-6 text-slate-400">جلسه یا پکیج چندمرحله‌ای ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {patientAdmissions
                    .filter((a) => a.details.sessionNumber)
                    .map((adm) => (
                      <div
                        key={adm.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{adm.serviceName}</span>
                          <span className="text-slate-400 mr-2 text-[11px]">
                            ({formatPersianDateReadable(adm.date)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-sky-700">
                            جلسه {adm.details.sessionNumber} از {adm.details.totalSessions || '؟'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Follow-up & Next Appointments */}
          {activeTab === 'followup' && (
            <div className="space-y-3">
              {followUps.filter((f) => f.patientId === patient.id).length === 0 ? (
                <p className="text-center py-6 text-slate-400">نوبت مراجعه بعدی ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {followUps
                    .filter((f) => f.patientId === patient.id)
                    .map((flw) => (
                      <div
                        key={flw.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{flw.serviceName}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{flw.reason}</p>
                        </div>
                        <div className="text-left font-mono tabular-nums">
                          <span className="font-bold text-sky-700 block">
                            {formatPersianDateReadable(flw.scheduledDate)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            وضعیت: {flw.status === 'pending' ? 'در انتظار' : flw.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
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

      {/* Edit Patient Dossier Modal */}
      <EditPatientModal
        isOpen={isEditingPatient}
        patient={patient}
        onClose={() => setIsEditingPatient(false)}
        onPatientUpdated={(updated) => {
          onUpdatePatient(updated);
        }}
        existingPatients={patients}
      />
    </div>
  );
};
