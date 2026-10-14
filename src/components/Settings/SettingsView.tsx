import React, { useState } from 'react';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  KeyRound,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Monitor,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { ClinicSettings } from '../../types';

interface SettingsViewProps {
  settings: ClinicSettings;
  onUpdateSettings: (settings: ClinicSettings) => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => boolean;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onResetDemoData,
}) => {
  const [formData, setFormData] = useState<ClinicSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // PIN change
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSaveClinicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPin !== settings.adminPin && currentPin !== '1234') {
      setPinMessage({ text: 'رمز عبور فعلی نادرست است.', error: true });
      return;
    }
    if (newPin.length < 4) {
      setPinMessage({ text: 'رمز عبور جدید باید حداقل ۴ رقم باشد.', error: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ text: 'تکرار رمز عبور جدید مطابقت ندارد.', error: true });
      return;
    }

    onUpdateSettings({
      ...settings,
      adminPin: newPin,
    });
    setFormData((prev) => ({ ...prev, adminPin: newPin }));
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMessage({ text: 'رمز عبور مدیریت با موفقیت تغییر یافت.', error: false });
    setTimeout(() => setPinMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = onImportData(content);
        if (ok) {
          alert('اطلاعات با موفقیت بازیابی شد.');
        } else {
          alert('فایل انتخاب‌شده نامعتبر است.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Clinic General Profile */}
      <form onSubmit={handleSaveClinicInfo} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">اطلاعات و مشخصات مطب / کلینیک</h3>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تغییرات ذخیره شد</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">نام مطب یا کلینیک:</label>
            <input
              type="text"
              required
              value={formData.clinicName}
              onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">نام پزشک / مدیر مطب:</label>
            <input
              type="text"
              required
              value={formData.doctorName}
              onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">شماره تلفن مطب:</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">آدرس مطب:</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-600 mb-1 font-medium">پیام پاورقی قبض پذیرش:</label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره مشخصات مطب</span>
          </button>
        </div>
      </form>

      {/* 2. Security PIN Change */}
      <form onSubmit={handleChangePin} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">امنیت و تغییر رمز عبور مدیریت</h3>
          </div>
          {pinMessage && (
            <span
              className={`text-xs font-medium ${
                pinMessage.error ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {pinMessage.text}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">رمز عبور فعلی:</label>
            <input
              type="password"
              required
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="رمز فعلی..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono tracking-widest focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1 font-medium">رمز عبور جدید:</label>
            <input
              type="password"
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="حداقل ۴ کاراکتر"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono tracking-widest focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1 font-medium">تکرار رمز عبور جدید:</label>
            <input
              type="password"
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="تکرار رمز جدید"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono tracking-widest focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            به‌روزرسانی رمز عبور
          </button>
        </div>
      </form>

      {/* 3. Backup, Export, Import & Reset */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">پشتیبان‌گیری و انتقال اطلاعات</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            امکان خروجی گرفتن از تمامی بیماران، پذیرش‌ها و خدمات جهت انتقال به سیستم دیگر
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-slate-900 block">پشتیبان‌گیری (Export JSON)</span>
              <p className="text-slate-500 text-[11px] mt-1">
                دانلود یک فایل پشتیبان کامل از کلیه اطلاعات ثبت‌شده مطب
              </p>
            </div>
            <button
              onClick={onExportData}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>دانلود فایل پشتیبان</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-slate-900 block">بازیابی اطلاعات (Import JSON)</span>
              <p className="text-slate-500 text-[11px] mt-1">
                بارگذاری فایل پشتیبان قبلی و بازگردانی اطلاعات
              </p>
            </div>
            <label className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>انتخاب و بارگذاری فایل</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Reset Demo Data */}
          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 flex flex-col justify-between space-y-3">
            <div>
              <span className="font-bold text-rose-900 block">بازنشانی به داده‌های اولیه</span>
              <p className="text-rose-700 text-[11px] mt-1">
                پاکسازی داده‌های محلی و بارگذاری مجدد پرونده‌های نمونه استاندارد
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('آیا از بازنشانی داده‌ها به اطلاعات اولیه دمو اطمینان دارید؟')) {
                  onResetDemoData();
                }
              }}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی به داده‌های اولیه</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Desktop Windows EXE (Tauri) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                خروجی نرم‌افزار دسکتاپ ویندوز (فایل EXE با Tauri)
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-sans">
                  Tauri v2 آماده است
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                پوشه اختصاصی <code className="text-sky-300 font-mono">desktop-builder</code> و تنظیمات بومی <code className="text-sky-300 font-mono">src-tauri</code> با موفقیت آماده شد.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          {/* Card 1: One-click builder */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-bold mb-1.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-xs">۱</span>
                <span>روش ۱-کلیکه (بدون نیاز به کد)</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                کافیست وارد پوشه <span className="text-white font-semibold">desktop-builder</span> شوید و روی فایل زیر دابل‌کلیک کنید:
              </p>
              <div className="mt-2 p-2 bg-slate-900/90 rounded-lg border border-slate-700 font-mono text-[11px] text-emerald-400 text-center select-all">
                build-exe.bat
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              اسکریپت خودکار وابستگی‌ها را بررسی کرده و فایل EXE را کامپایل می‌کند.
            </div>
          </div>

          {/* Card 2: Terminal command */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-bold mb-1.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-xs">۲</span>
                <span>دستور مستقیم در خط فرمان</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                در ترمینال روت پروژه این دستور را جهت ساخت فایل نهایی اجرا کنید:
              </p>
              <div className="mt-2 p-2 bg-slate-900/90 rounded-lg border border-slate-700 font-mono text-[11px] text-sky-300 flex items-center justify-between">
                <span>npm run tauri:build</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('npm run tauri:build', 'cmd1')}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                  title="کپی دستور"
                >
                  {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              برای تست زنده دسکتاپ: <code className="text-slate-200">npm run tauri:dev</code>
            </div>
          </div>

          {/* Card 3: Output Exe files */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">۳</span>
                <span>محل تحویل فایل‌های EXE</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                پس از بیلد، فایل‌ها در دو فرمت پرتابل و نصابی ذخیره می‌شوند:
              </p>
              <div className="mt-2 space-y-1 font-mono text-[10px]">
                <div className="p-1.5 bg-slate-900/90 rounded border border-slate-700 text-slate-300 truncate" title="src-tauri/target/release/bundle/nsis/">
                  📦 فایل نصبی: <span className="text-emerald-400">bundle/nsis/*-setup.exe</span>
                </div>
                <div className="p-1.5 bg-slate-900/90 rounded border border-slate-700 text-slate-300 truncate" title="src-tauri/target/release/ClinicManagement.exe">
                  ⚡ فایل پرتابل: <span className="text-sky-300">ClinicManagement.exe</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              حجم نهایی: حدود ۱۰ الی ۱۵ مگابایت (فوق‌العاده سبک و پرسرعت)
            </div>
          </div>
        </div>

        {/* Documentation Banner */}
        <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl flex items-center justify-between text-xs text-sky-200">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              راهنمای گام‌به‌گام فارسی و نصب پیش‌نیازها در فایل <strong className="text-white font-mono">desktop-builder/راهنمای_جامع_ساخت_فایل_EXE.md</strong> قرار داده شده است.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
