import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Key,
  FolderPlus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { MySQLConfig } from '../../types';
import {
  fetchMySQLConfig,
  saveMySQLConfig,
  testMySQLConnection,
  initMySQLTables,
  syncClinicDataToMySQL,
  loadClinicDataFromMySQL,
  clearAllMySQLData
} from '../../utils/api';

interface MySQLSettingsCardProps {
  currentClinicData: any;
  onDataLoadedFromMySQL: (data: any) => void;
  onClearLocalAndDBData: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MySQLSettingsCard: React.FC<MySQLSettingsCardProps> = ({
  currentClinicData,
  onDataLoadedFromMySQL,
  onClearLocalAndDBData,
  onToast,
}) => {
  const [config, setConfig] = useState<MySQLConfig>({
    host: 'services.irn4.chabokan.net',
    port: 14951,
    user: 'root',
    password: 'S9jClPz7YgoLF07V',
    database: 'fred',
    enabled: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  // Fetch saved config from backend on mount
  useEffect(() => {
    fetchMySQLConfig().then((cfg) => {
      if (cfg) {
        setConfig((prev) => ({
          ...prev,
          ...cfg,
          password: cfg.password || prev.password || '',
        }));
      }
    });
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testMySQLConnection(config);
      setTestResult(res);
      if (res.success) {
        onToast('اتصال به MySQL با موفقیت بررسی و تایید شد.', 'success');
      } else {
        onToast(res.message, 'error');
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'خطا در برقراری ارتباط با سرور',
      });
      onToast('خطا در اتصال به MySQL', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleInitTables = async () => {
    setIsInitializing(true);
    try {
      const res = await initMySQLTables(config);
      if (res.success) {
        setConfig((prev) => ({ ...prev, enabled: true }));
        setTestResult(res);
        onToast(res.message, 'success');
      } else {
        onToast(res.message, 'error');
      }
    } catch (e: any) {
      onToast(`خطا در ساخت جداول: ${e.message}`, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveMySQLConfig(config);
      if (res.success) {
        onToast(res.message || 'تنظیمات MySQL با موفقیت ذخیره شد.', 'success');
      } else {
        onToast(res.message || 'خطا در ذخیره تنظیمات', 'error');
      }
    } catch (e: any) {
      onToast(`خطا: ${e.message}`, 'error');
    }
  };

  const handleSyncToMySQL = async () => {
    if (!config.enabled) {
      onToast('لطفاً ابتدا تیک «فعال‌سازی ذخیره‌سازی در MySQL» را فعال کرده و تنظیمات را ذخیره کنید.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncClinicDataToMySQL(currentClinicData);
      if (res.success) {
        onToast(res.message, 'success');
      } else {
        onToast(res.message, 'error');
      }
    } catch (e: any) {
      onToast(`خطا در همگام‌سازی: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromMySQL = async () => {
    if (!config.enabled) {
      onToast('اتصال به MySQL فعال نیست.', 'error');
      return;
    }
    setIsLoadingData(true);
    try {
      const res = await loadClinicDataFromMySQL();
      if (res.success && res.data) {
        onDataLoadedFromMySQL(res.data);
        onToast(`اطلاعات با موفقیت از MySQL لود شد (${res.data.patients?.length || 0} بیمار، ${res.data.admissions?.length || 0} پذیرش).`, 'success');
      } else {
        onToast(res.message || 'خطا در بارگذاری اطلاعات از دیتابیس', 'error');
      }
    } catch (e: any) {
      onToast(`خطا در لود اطلاعات: ${e.message}`, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleClearAll = async () => {
    const confirm1 = confirm('هشدار: این عملیات تمامی پرونده‌های بیماران و پذیرش‌ها را چه در مرورگر و چه در دیتابیس MySQL به صورت کامل پاکسازی می‌کند تا سیستم برای ورود اطلاعات واقعی جدید آماده باشد. آیا مطمئنید؟');
    if (!confirm1) return;

    if (config.enabled) {
      await clearAllMySQLData().catch(() => {});
    }
    onClearLocalAndDBData();
    onToast('تمامی داده‌های آزمایشی با موفقیت حذف شدند. سیستم کاملاً خام و آماده ثبت اطلاعات واقعی مطب است.', 'info');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">اتصال به پایگاه داده MySQL (ذخیره پایدار داده‌ها)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تنظیم آدرس سرور، پورت، نام کاربری و دیتابیس جهت ذخیره و همگام‌سازی کلیه پرونده‌ها در MySQL
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {config.enabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>دیتابیس MySQL فعال است</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>حالت محلی (ذخیره در مرورگر/سیستم)</span>
            </span>
          )}
        </div>
      </div>

      {/* Connection Test Result Alert */}
      {testResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            testResult.success
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              : 'bg-rose-50/70 border-rose-200 text-rose-800'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">{testResult.message}</div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSaveConfig} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {/* Host */}
          <div>
            <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>آدرس سرور دیتابیس (Host / IP):</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثلاً 127.0.0.1 یا localhost"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-blue-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          {/* Port */}
          <div>
            <label className="block text-slate-600 mb-1 font-medium">پورت MySQL (Port):</label>
            <input
              type="number"
              required
              placeholder="3306"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 3306 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-blue-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          {/* Database Name */}
          <div>
            <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>نام پایگاه داده (Database):</span>
            </label>
            <input
              type="text"
              required
              placeholder="clinic_db"
              value={config.database}
              onChange={(e) => setConfig({ ...config, database: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-blue-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-slate-600 mb-1 font-medium">نام کاربری (Username):</label>
            <input
              type="text"
              required
              placeholder="root"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-blue-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>رمز عبور (Password):</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="رمز عبور MySQL (در صورت وجود)"
                value={config.password || ''}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-blue-500 focus:outline-none"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Enable Toggle Switch */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-800">
                استفاده از MySQL به عنوان دیتابیس اصلی مطب
              </span>
            </label>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Test Connection Button */}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'در حال تست اتصال...' : 'تست اتصال به سرور'}</span>
            </button>

            {/* Init Tables Button */}
            <button
              type="button"
              onClick={handleInitTables}
              disabled={isInitializing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-xl text-xs font-medium transition-colors disabled:opacity-60"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>{isInitializing ? 'در حال ایجاد جداول...' : 'ساخت خودکار جداول دیتابیس'}</span>
            </button>
          </div>

          {/* Save Config Button */}
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ذخیره تنظیمات MySQL</span>
          </button>
        </div>
      </form>

      {/* Data Synchronization & Migration Controls */}
      <div className="pt-3 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 mb-2.5">عملیات انتقال و همگام‌سازی داده‌ها با MySQL</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sync to MySQL */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-between space-y-2.5">
            <div>
              <span className="font-bold text-slate-800 text-xs block">ارسال به MySQL (Sync Up)</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                ذخیره کلیه اطلاعات فعلی ثبت‌شده در دیتابیس MySQL
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncToMySQL}
              disabled={isSyncing || !config.enabled}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowUpFromLine className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? 'در حال همگام‌سازی...' : 'ارسال اطلاعات به MySQL'}</span>
            </button>
          </div>

          {/* Load from MySQL */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-between space-y-2.5">
            <div>
              <span className="font-bold text-slate-800 text-xs block">دریافت از MySQL (Load Down)</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                بارگذاری کامل پرونده‌ها و پذیرش‌ها از دیتابیس MySQL
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadFromMySQL}
              disabled={isLoadingData || !config.enabled}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowDownToLine className={`w-3.5 h-3.5 text-emerald-600 ${isLoadingData ? 'animate-bounce' : ''}`} />
              <span>{isLoadingData ? 'در حال دریافت...' : 'بارگذاری از MySQL'}</span>
            </button>
          </div>

          {/* Clear All Mock & Real Data */}
          <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/60 flex flex-col justify-between space-y-2.5">
            <div>
              <span className="font-bold text-rose-900 text-xs block">پاکسازی کامل و شروع واقعی</span>
              <p className="text-rose-700 text-[11px] mt-0.5">
                حذف کلیه پرونده‌های نمونه، پذیرش‌ها و صفر کردن سیستم
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>پاکسازی همه داده‌های آزمایشی</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
