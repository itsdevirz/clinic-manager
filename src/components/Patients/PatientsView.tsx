import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  FileText,
  Edit2
} from 'lucide-react';
import { Patient, Admission, FollowUpReminder } from '../../types';
import {
  formatToman,
  formatPersianDateReadable
} from '../../utils/persianDate';
import { NewPatientModal } from './NewPatientModal';
import { EditPatientModal } from './EditPatientModal';

interface PatientsViewProps {
  patients: Patient[];
  admissions: Admission[];
  followUps: FollowUpReminder[];
  onOpenReceptionForPatient: (patientId?: string) => void;
  onOpenPatientDossier: (patientId: string) => void;
  onPatientCreated?: (patient: Patient) => void;
  onUpdatePatient?: (updated: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  admissions,
  followUps,
  onOpenReceptionForPatient,
  onOpenPatientDossier,
  onPatientCreated,
  onUpdatePatient,
}) => {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<'all' | 'female' | 'male'>('all');
  const [debtFilter, setDebtFilter] = useState<'all' | 'with_debt' | 'settled'>('all');

  // Patients with their computed stats (last visit, total debt, next appointment)
  const patientStats = useMemo(() => {
    const stats: Record<
      string,
      {
        lastAdmission?: Admission;
        totalDebt: number;
        nextFollowUp?: FollowUpReminder;
        admissionCount: number;
      }
    > = {};

    patients.forEach((p) => {
      const pAdmissions = admissions.filter((a) => a.patientId === p.id);
      const sortedAdm = [...pAdmissions].sort((a, b) => b.timestamp - a.timestamp);
      const totalDebt = pAdmissions.reduce((sum, a) => sum + (a.debtAmount || 0), 0);

      const pFollowUps = followUps.filter((f) => f.patientId === p.id && f.status === 'pending');
      const nextFollowUp = pFollowUps[0];

      stats[p.id] = {
        lastAdmission: sortedAdm[0],
        totalDebt,
        nextFollowUp,
        admissionCount: pAdmissions.length,
      };
    });

    return stats;
  }, [patients, admissions, followUps]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName =
          p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q);
        const matchesNational = p.nationalId.includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesAge = String(p.age).includes(q);
        if (!matchesName && !matchesNational && !matchesPhone && !matchesAge) {
          return false;
        }
      }

      // Gender filter
      if (selectedGender !== 'all' && p.gender !== selectedGender) {
        return false;
      }

      // Debt filter
      const debt = patientStats[p.id]?.totalDebt || 0;
      if (debtFilter === 'with_debt' && debt <= 0) return false;
      if (debtFilter === 'settled' && debt > 0) return false;

      return true;
    });
  }, [patients, searchQuery, selectedGender, debtFilter, patientStats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search & Filter Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">بانک اطلاعات و پرونده بیماران</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              مجموع {patients.length} پرونده ثبت‌شده در سیستم
            </p>
          </div>
          <button
            onClick={() => setIsNewPatientModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ ثبت بیمار جدید</span>
          </button>
        </div>

        {/* Powerful Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام، نام خانوادگی، کد ملی، شماره تماس یا سن..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-sky-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
            >
              <option value="all">همه جنسیت‌ها</option>
              <option value="female">بانوان</option>
              <option value="male">آقایان</option>
            </select>

            <select
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
            >
              <option value="all">همه وضعیت‌های مالی</option>
              <option value="with_debt">دارای مانده بدهی</option>
              <option value="settled">تسویه‌شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-600">هنوز بیماری با این مشخصات یافت نشد</p>
            <p className="text-xs text-slate-400 mt-1">
              می‌توانید کلمه جستجو را تغییر دهید یا بیمار جدیدی ثبت فرمایید
            </p>
            <button
              onClick={() => setIsNewPatientModalOpen(true)}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition-colors cursor-pointer"
            >
              + ثبت بیمار جدید
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-4 font-semibold">نام و نام خانوادگی</th>
                  <th className="py-3 px-4 font-semibold">کد ملی</th>
                  <th className="py-3 px-4 font-semibold">شماره تماس</th>
                  <th className="py-3 px-4 font-semibold">سن / جنسیت</th>
                  <th className="py-3 px-4 font-semibold">آخرین خدمت</th>
                  <th className="py-3 px-4 font-semibold">مراجعه بعدی</th>
                  <th className="py-3 px-4 font-semibold text-left">مانده بدهی</th>
                  <th className="py-3 px-4 font-semibold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPatients.map((p) => {
                  const stat = patientStats[p.id];
                  const lastAdm = stat?.lastAdmission;
                  const nextFlw = stat?.nextFollowUp;
                  const debt = stat?.totalDebt || 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onOpenPatientDossier(p.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 hover:text-sky-600 transition-colors">
                          {p.firstName} {p.lastName}
                        </div>
                        {p.job && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            شغل: {p.job}
                          </span>
                        )}
                        {p.medicalHistory && p.medicalHistory !== 'ندارد' && (
                          <span className="text-[10px] text-amber-700 block mt-0.5">
                            سابقه: {p.medicalHistory}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {p.nationalId || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {p.phone}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono tabular-nums">{p.age} سال</span> ·{' '}
                        <span>{p.gender === 'female' ? 'خانم' : 'آقا'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {lastAdm ? (
                          <div>
                            <span className="font-medium text-slate-800">{lastAdm.serviceName}</span>
                            <span className="block text-[11px] text-slate-400 font-mono tabular-nums">
                              {formatPersianDateReadable(lastAdm.date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">بدون مراجعه قبلی</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {nextFlw ? (
                          <div className="text-sky-700 font-medium">
                            <span className="font-mono tabular-nums">
                              {formatPersianDateReadable(nextFlw.scheduledDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">تعیین نشده</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-left font-mono tabular-nums">
                        {debt > 0 ? (
                          <span className="text-rose-600 font-bold">{formatToman(debt)}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">تسویه</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenPatientDossier(p.id)}
                            className="px-2 py-1 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            مشاهده پرونده
                          </button>
                          <button
                            onClick={() => setEditingPatient(p)}
                            className="px-2 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            title="اصلاح مشخصات و پرونده بیمار"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>اصلاح پرونده</span>
                          </button>
                          <button
                            onClick={() => onOpenReceptionForPatient(p.id)}
                            className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            + پذیرش
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

      {/* New Patient Registration Modal */}
      <NewPatientModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onPatientCreated={(newPatient) => {
          if (onPatientCreated) {
            onPatientCreated(newPatient);
          }
        }}
        existingPatients={patients}
      />

      {/* Edit Patient Dossier Modal */}
      <EditPatientModal
        isOpen={!!editingPatient}
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
        onPatientUpdated={(updated) => {
          if (onUpdatePatient) {
            onUpdatePatient(updated);
          }
        }}
        existingPatients={patients}
      />
    </div>
  );
};
