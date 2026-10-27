import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Check, Briefcase, MapPin, Phone, User, FileText } from 'lucide-react';
import { Patient, Gender } from '../../types';
import { getTodayPersianDate } from '../../utils/persianDate';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patient: Patient) => void;
  existingPatients?: Patient[];
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
  isOpen,
  onClose,
  onPatientCreated,
  existingPatients = [],
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [job, setJob] = useState('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender>('female');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');

  // Form errors
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  if (!isOpen) return null;

  const isFirstNameValid = firstName.trim().length > 0;
  const isLastNameValid = lastName.trim().length > 0;
  const normalizedPhone = phone.trim().replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const isPhoneValid = normalizedPhone.length === 0 || /^\d{11}$/.test(normalizedPhone);

  const normalizedNationalId = nationalId.trim().replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const isNationalIdValid = normalizedNationalId.length === 0 || /^\d{10}$/.test(normalizedNationalId);
  const duplicateNationalId = normalizedNationalId.length > 0 && existingPatients.some((p) => {
    const existing = (p.nationalId || '').trim().replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
    return existing === normalizedNationalId;
  });
  const canSubmit = isFirstNameValid && isLastNameValid && isPhoneValid && isNationalIdValid && !duplicateNationalId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!canSubmit) {
      if (duplicateNationalId) alert('بیمار با این کد ملی در پرونده‌ها وجود دارد.');
      return;
    }

    const today = getTodayPersianDate();
    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone,
      job: job.trim() || undefined,
      address: address.trim() || 'ثبت نشده',
      nationalId: normalizedNationalId,
      age: age ? parseInt(age, 10) || 0 : 0,
      gender,
      medicalHistory: medicalHistory.trim() || 'ندارد',
      allergies: allergies.trim() || 'ندارد',
      notes: notes.trim() || undefined,
      createdAt: today,
    };

    onPatientCreated(newPatient);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setJob('');
    setAddress('');
    setNationalId('');
    setAge('');
    setGender('female');
    setMedicalHistory('');
    setAllergies('');
    setNotes('');
    setTouched({});
    setSubmitAttempted(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Check for duplicate warning (informational only)
  const isDuplicatePhone = normalizedPhone.length === 11 && existingPatients.some(
    (p) => p.phone.trim() === phone.trim()
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] text-right"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تشکیل پرونده بیمار جدید</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1 text-xs">
          {/* Validation Notice if attempted submit without required fields */}
          {submitAttempted && !canSubmit && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">امکان ثبت پرونده وجود ندارد!</p>
                <p className="text-[11px] text-rose-600 mt-0.5">
                  لطفاً فیلدهای اجباری مشخص‌شده با نشان قرمز (نام، نام خانوادگی و شماره تماس) را تکمیل فرمایید و قالب اطلاعات اختیاری را بررسی کنید.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Required Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-600" />
                اطلاعات اصلی بیمار
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* First Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  نام <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                  placeholder="مثال: سارا"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/60 focus:bg-white text-xs outline-hidden transition-all ${
                    (submitAttempted || touched.firstName) && !isFirstNameValid
                      ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                  }`}
                  autoFocus
                />
                {(submitAttempted || touched.firstName) && !isFirstNameValid && (
                  <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    وارد کردن نام بیمار اجباری است.
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  نام خانوادگی <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, lastName: true }))}
                  placeholder="مثال: رضایی"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/60 focus:bg-white text-xs outline-hidden transition-all ${
                    (submitAttempted || touched.lastName) && !isLastNameValid
                      ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                  }`}
                />
                {(submitAttempted || touched.lastName) && !isLastNameValid && (
                  <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    وارد کردن نام خانوادگی بیمار اجباری است.
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  شماره تماس همراه <span className="text-slate-400 text-[10px]">(اختیاری)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                    placeholder="09123456789"
                    className={`w-full pr-10 pl-3.5 py-2.5 rounded-xl border bg-slate-50/60 focus:bg-white text-xs font-mono outline-hidden transition-all text-right ${
                      (submitAttempted || touched.phone) && !isPhoneValid
                        ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30'
                        : 'border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                    }`}
                  />
                </div>
                {(submitAttempted || touched.phone) && !isPhoneValid && (
                  <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    شماره تلفن در صورت ورود باید دقیقاً ۱۱ رقم باشد.
                  </p>
                )}
                {isDuplicatePhone && (
                  <p className="text-amber-700 text-[11px] mt-1 flex items-center gap-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200/80">
                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                    توجه: پرونده دیگری با این شماره تماس قبلاً در سیستم ثبت شده است.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Personal & Contact Information */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-sky-600" />
                مشخصات شغلی، سکونت و فردی
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Job / Occupation */}
              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>شغل / حرفه بیمار</span>
                </label>
                <input
                  type="text"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  placeholder="مثال: مهندس، کارمند، پزشک، خانه‌دار..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs outline-hidden transition-all"
                />
              </div>

              {/* National ID */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  کد ملی
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="0012345678"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/60 focus:bg-white focus:ring-2 text-xs font-mono outline-hidden transition-all text-right ${duplicateNationalId || !isNationalIdValid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-sky-500 focus:ring-sky-100'}`}
                />
                {duplicateNationalId && <p className="mt-1.5 text-[11px] font-semibold text-rose-600" role="alert">بیمار با این کد ملی در پرونده‌ها وجود دارد.</p>}
                {!isNationalIdValid && <p className="mt-1.5 text-[11px] font-semibold text-rose-600" role="alert">کد ملی در صورت ورود باید دقیقاً ۱۰ رقم باشد.</p>}
              </div>

              {/* Age */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  سن
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="مثال: ۳۲"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs outline-hidden transition-all"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  جنسیت
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      gender === 'female'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>خانم</span>
                    {gender === 'female' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      gender === 'male'
                        ? 'bg-sky-50 border-sky-300 text-sky-700 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>آقا</span>
                    {gender === 'male' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>آدرس محل سکونت</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: تهران، سعادت‌آباد، خیابان سرو غربی..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medical Notes & Warnings */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                سوابق پزشکی و حساسیت‌ها
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  سابقه بیماری خاص یا زمینه‌ای:
                </label>
                <input
                  type="text"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="مثال: تیروئید، دیابت، فشار خون (پیش‌فرض: ندارد)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  حساسیت‌های دارویی یا پوستی:
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="مثال: حساسیت به لیدوکائین یا بتادین (پیش‌فرض: ندارد)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs outline-hidden transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">
                  یادداشت و توصیه‌های اولیه پرونده:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="هرگونه یادداشت برای پرونده بیمار..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-xs outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>ثبت و تشکیل پرونده</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
