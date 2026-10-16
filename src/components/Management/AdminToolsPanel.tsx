import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  FileJson,
} from 'lucide-react';
import { ClinicSettings } from '../../types';
import { MongoSettingsCard } from '../Settings/MongoSettingsCard';

interface AdminToolsPanelProps {
  settings: ClinicSettings;
  clinicData: any;
  onUpdateSettings: (settings: ClinicSettings) => void;
  onExportData: () => void;
  onImportData: (json: string) => boolean | Promise<boolean>;
  onDataLoadedFromMongo: (data: any) => void;
  onClearLocalAndDBData: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshAppConnection: () => Promise<boolean>;
}

export const AdminToolsPanel: React.FC<AdminToolsPanelProps> = ({
  settings,
  clinicData,
  onUpdateSettings,
  onExportData,
  onImportData,
  onDataLoadedFromMongo,
  onClearLocalAndDBData,
  onToast,
  onRefreshAppConnection,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleChangePin = (event: React.FormEvent) => {
    event.preventDefault();
    if (currentPin !== settings.adminPin) {
      setPinMessage({ text: 'رمز مدیریت فعلی نادرست است.', error: true });
      return;
    }
    if (!/^\d{4,10}$/.test(newPin)) {
      setPinMessage({ text: 'رمز جدید باید بین ۴ تا ۱۰ رقم باشد.', error: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ text: 'تکرار رمز جدید مطابقت ندارد.', error: true });
      return;
    }
    if (newPin === currentPin) {
      setPinMessage({ text: 'رمز جدید باید با رمز فعلی متفاوت باشد.', error: true });
      return;
    }

    onUpdateSettings({ ...settings, adminPin: newPin });
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMessage({ text: 'رمز مدیریت با موفقیت تغییر کرد.', error: false });
    onToast('رمز مدیریت با موفقیت تغییر کرد.');
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      onToast('فقط فایل پشتیبان JSON قابل قبول است.', 'error');
      return;
    }
    if (!window.confirm('بازیابی پشتیبان، اطلاعات فعلی برنامه را با اطلاعات فایل جایگزین می‌کند. قبل از ادامه از اطلاعات فعلی نسخه پشتیبان بگیرید. ادامه می‌دهید؟')) {
      return;
    }

    setIsImporting(true);
    try {
      const json = await file.text();
      const ok = await onImportData(json);
      if (ok) {
        onToast('بازیابی اطلاعات انجام شد. اگر MongoDB فعال باشد، همگام‌سازی اطلاعات نیز انجام می‌شود.');
      } else {
        onToast('فایل انتخاب‌شده معتبر نیست یا ساختار پشتیبان پشتیبانی نمی‌شود.', 'error');
      }
    } catch {
      onToast('خواندن فایل پشتیبان ناموفق بود.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12" dir="rtl">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
          <div>
            <h3 className="font-bold text-sky-950">ابزارهای حساس مدیریت مطب</h3>
            <p className="mt-1 text-sm leading-6 text-sky-900">
              این بخش فقط پس از بازکردن قفل مدیریت نمایش داده می‌شود. فایل پشتیبان شامل اطلاعات کاری مطب است و رمز مدیریت و رمز اتصال دیتابیس را در خود نگه نمی‌دارد.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><FileJson className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900">پشتیبان‌گیری و بازیابی اطلاعات</h3>
            <p className="mt-1 text-xs text-slate-500">از بیماران، پذیرش‌ها، خدمات، اپراتورها، مواد مصرفی و تنظیمات عمومی نسخه پشتیبان تهیه کنید.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onExportData} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
            <Download className="h-4 w-4" /> دریافت فایل پشتیبان
          </button>
          <button type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800 transition-colors hover:bg-sky-100 disabled:opacity-60">
            <Upload className="h-4 w-4" /> {isImporting ? 'در حال بازیابی…' : 'انتخاب فایل و بازیابی'}
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
          <p>بازیابی، اطلاعات فعلی را جایگزین می‌کند. قبل از واردکردن فایل، حتماً از وضعیت فعلی پشتیبان بگیرید. برای انتقال کامل بین رایانه‌ها، تنظیمات اتصال MongoDB در مقصد را جداگانه بررسی کنید.</p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-xl bg-violet-50 p-2 text-violet-700"><KeyRound className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900">تغییر رمز مدیریت</h3>
            <p className="mt-1 text-xs text-slate-500">رمز جدید بین ۴ تا ۱۰ رقم باشد و آن را در جای امن نگه دارید.</p>
          </div>
        </div>
        <form onSubmit={handleChangePin} className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            <span>رمز فعلی</span>
            <input type="password" inputMode="numeric" autoComplete="current-password" required value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-mono tracking-widest outline-none focus:border-sky-500" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            <span>رمز جدید</span>
            <input type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={10} value={newPin} onChange={(e) => setNewPin(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-mono tracking-widest outline-none focus:border-sky-500" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            <span>تکرار رمز جدید</span>
            <input type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={10} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-mono tracking-widest outline-none focus:border-sky-500" />
          </label>
          <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
            {pinMessage ? (
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${pinMessage.error ? 'text-rose-600' : 'text-emerald-700'}`}>
                {pinMessage.error ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {pinMessage.text}
              </p>
            ) : <span />}
            <button type="submit" className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-violet-700">ذخیره رمز جدید</button>
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-xl bg-sky-50 p-2 text-sky-700"><Database className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-900">اتصال به دیتابیس MongoDB</h3>
            <p className="mt-1 text-xs text-slate-500">تنظیمات اتصال، تست اتصال و بازیابی داده‌های پایگاه داده در همین بخش مدیریت قرار دارد.</p>
          </div>
        </div>
        <MongoSettingsCard
          currentClinicData={clinicData}
          onDataLoadedFromMongo={onDataLoadedFromMongo}
          onClearLocalAndDBData={onClearLocalAndDBData}
          onToast={onToast}
          onRefreshAppConnection={onRefreshAppConnection}
        />
      </section>
    </div>
  );
};
