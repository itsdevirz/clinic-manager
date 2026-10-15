import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Key,
  FolderPlus,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { MySQLConfig } from '../../types';
import {
  DEFAULT_MYSQL_CONFIG,
  fetchMySQLConfig,
  saveMySQLConfig,
  testMySQLConnection,
  initMySQLTables,
  resetMySQLToDefault,
} from '../../utils/api';

interface MySQLSettingsCardProps {
  currentClinicData: any;
  onDataLoadedFromMySQL: (data: any) => void;
  onClearLocalAndDBData: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshAppConnection?: () => Promise<boolean>;
}

export const MySQLSettingsCard: React.FC<MySQLSettingsCardProps> = ({
  currentClinicData,
  onDataLoadedFromMySQL,
  onClearLocalAndDBData,
  onToast,
  onRefreshAppConnection,
}) => {
  const [config, setConfig] = useState<MySQLConfig>(DEFAULT_MYSQL_CONFIG);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  // Fetch saved config from backend on mount (or use DEFAULT_MYSQL_CONFIG)
  useEffect(() => {
    fetchMySQLConfig().then((cfg) => {
      if (cfg) {
        setConfig((prev) => ({
          ...DEFAULT_MYSQL_CONFIG,
          ...cfg,
          password: cfg.password !== undefined ? cfg.password : prev.password,
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
        onToast('اتصال به دیتابیس با موفقیت بررسی و تایید شد.', 'success');
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

  // Save config and connect directly to the database
  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);
    try {
      // 1. Save config to server
      const res = await saveMySQLConfig(config);
      if (!res.success) {
        onToast(res.message || 'خطا در ذخیره تنظیمات دیتابیس', 'error');
        setIsTesting(false);
        return;
      }

      if (!config.enabled) {
        onToast('تنظیمات ذخیره شد (ذخیره‌سازی در دیتابیس MySQL غیرفعال شد).', 'info');
        if (onRefreshAppConnection) {
          await onRefreshAppConnection();
        }
        setIsTesting(false);
        return;
      }

      // 2. Test connection to the new database
      const testRes = await testMySQLConnection(config);
      setTestResult(testRes);

      if (!testRes.success) {
        onToast(`اخطار در اتصال: ${testRes.message}`, 'error');
        if (onRefreshAppConnection) {
          await onRefreshAppConnection();
        }
        setIsTesting(false);
        return;
      }

      // 3. If database exists but tables are missing, auto create them
      if (!testRes.databaseExists || (testRes.tablesCount !== undefined && testRes.tablesCount < 5)) {
        const initRes = await initMySQLTables(config);
        if (initRes.success) {
          onToast('پایگاه داده جدید و جداول مربوطه با موفقیت ایجاد و آماده‌سازی شدند.', 'info');
        }
      }

      // 4. Connect application to the new database and sync/load
      if (onRefreshAppConnection) {
        await onRefreshAppConnection();
      }

      onToast(`با موفقیت به پایگاه داده (${config.database} در ${config.host}) متصل شدید.`, 'success');
    } catch (e: any) {
      onToast(`خطا: ${e.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Reset to default main database
  const handleResetToDefault = async () => {
    setIsResetting(true);
    try {
      const res = await resetMySQLToDefault();
      if (res.success) {
        setConfig(DEFAULT_MYSQL_CONFIG);
        const testRes = await testMySQLConnection(DEFAULT_MYSQL_CONFIG);
        setTestResult(testRes);
        if (onRefreshAppConnection) {
          await onRefreshAppConnection();
        }
        onToast('تنظیمات به مقادیر پیش‌فرض محلی (127.0.0.1:3306) بازنشانی شد.', 'success');
      } else {
        onToast(res.message, 'error');
      }
    } catch (e: any) {
      onToast(`خطا: ${e.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
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
            <h3 className="font-bold text-slate-900 text-sm">اتصال به پایگاه داده MySQL (ذخیره پایدار و خودکار داده‌ها)</h3>
          </div>
        </div>
      </div>

      {/* Reset to Default Action */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleResetToDefault}
          disabled={isResetting || isTesting}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          title="بازنشانی تمام فیلدها به مقادیر پیش‌فرض"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'در حال بازنشانی...' : 'بازنشانی به پیش‌فرض'}</span>
        </button>
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
      <form onSubmit={handleSaveAndConnect} className="space-y-4">
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
              placeholder="127.0.0.1"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-blue-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          {/* Port */}
          <div>
            <label className="block text-slate-600 mb-1 font-medium">
              <span>پورت MySQL (Port):</span>
            </label>
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
            <label className="block text-slate-600 mb-1 font-medium">
              <span>نام کاربری (Username):</span>
            </label>
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
                placeholder="بدون رمز عبور (یا رمز عبور MySQL)"
                value={config.password || ''}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-blue-500 focus:outline-none"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'در حال بررسی...' : 'تست اتصال به سرور'}</span>
            </button>

            {/* Init Tables Button */}
            <button
              type="button"
              onClick={handleInitTables}
              disabled={isInitializing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-xl text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>{isInitializing ? 'در حال ایجاد جداول...' : 'ساخت خودکار جداول دیتابیس'}</span>
            </button>
          </div>

          {/* Save & Connect Button */}
          <button
            type="submit"
            disabled={isTesting}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-blue-600/30 cursor-pointer disabled:opacity-60 active:scale-95"
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isTesting ? 'در حال اتصال به دیتابیس...' : 'ذخیره تنظیمات و اتصال به پایگاه داده'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
