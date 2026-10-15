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
  Link as LinkIcon,
} from 'lucide-react';
import { MongoConfig } from '../../types';
import {
  DEFAULT_MONGO_CONFIG,
  fetchMongoConfig,
  saveMongoConfig,
  testMongoConnection,
  initMongoCollections,
  resetMongoToDefault,
} from '../../utils/api';

interface MongoSettingsCardProps {
  currentClinicData: any;
  onDataLoadedFromMongo: (data: any) => void;
  onClearLocalAndDBData: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshAppConnection?: () => Promise<boolean>;
}

export const MongoSettingsCard: React.FC<MongoSettingsCardProps> = ({
  onToast,
  onRefreshAppConnection,
}) => {
  const [config, setConfig] = useState<MongoConfig>(DEFAULT_MONGO_CONFIG);
  const [showPassword, setShowPassword] = useState(false);
  const [useUri, setUseUri] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  useEffect(() => {
    fetchMongoConfig().then((cfg) => {
      if (cfg) {
        setConfig((prev) => ({
          ...DEFAULT_MONGO_CONFIG,
          ...cfg,
          database: cfg.database || 'clinic',
          password: cfg.password !== undefined ? cfg.password : prev.password,
        }));
      }
    });
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testMongoConnection(config);
      setTestResult(res);
      if (res.success) {
        onToast('اتصال به دیتابیس MongoDB با موفقیت بررسی و تایید شد.', 'success');
      } else {
        onToast(res.message, 'error');
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'خطا در برقراری ارتباط با سرور MongoDB',
      });
      onToast('خطا در اتصال به MongoDB', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleInitCollections = async () => {
    setIsInitializing(true);
    try {
      const res = await initMongoCollections(config);
      if (res.success) {
        setConfig((prev) => ({ ...prev, enabled: true }));
        setTestResult(res);
        onToast(res.message, 'success');
      } else {
        onToast(res.message, 'error');
      }
    } catch (e: any) {
      onToast(`خطا در ایجاد کلوکشن‌ها: ${e.message}`, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await saveMongoConfig(config);
      if (!res.success) {
        onToast(res.message || 'خطا در ذخیره تنظیمات دیتابیس', 'error');
        setIsTesting(false);
        return;
      }

      if (!config.enabled) {
        onToast('تنظیمات ذخیره شد (ذخیره‌سازی در دیتابیس MongoDB غیرفعال شد).', 'info');
        if (onRefreshAppConnection) {
          await onRefreshAppConnection();
        }
        setIsTesting(false);
        return;
      }

      const testRes = await testMongoConnection(config);
      setTestResult(testRes);

      if (!testRes.success) {
        onToast(`اخطار در اتصال: ${testRes.message}`, 'error');
        if (onRefreshAppConnection) {
          await onRefreshAppConnection();
        }
        setIsTesting(false);
        return;
      }

      await initMongoCollections(config);

      if (onRefreshAppConnection) {
        await onRefreshAppConnection();
      }

      onToast(`با موفقیت به پایگاه داده MongoDB (دیتابیس ${config.database || 'clinic'}) متصل شدید.`, 'success');
    } catch (e: any) {
      onToast(`خطا: ${e.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsResetting(true);
    try {
      const res = await resetMongoToDefault();
      if (res.success) {
        setConfig(DEFAULT_MONGO_CONFIG);
        const testRes = await testMongoConnection(DEFAULT_MONGO_CONFIG);
        setTestResult(testRes);
        if (onRefreshAppConnection) {
          await onRefreshAppConnection();
        }
        onToast('تنظیمات به مقادیر پیش‌فرض MongoDB (دیتابیس clinic) بازنشانی شد.', 'success');
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
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">اتصال به پایگاه داده MongoDB (دیتابیس clinic)</h3>
          </div>
        </div>
      </div>

      {/* Mode Switch & Reset */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setUseUri(!useUri)}
          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>{useUri ? 'ورود پارامترهای جداگانه (Host/Port)' : 'ورود آدرس مستقیم (MongoDB Connection URI)'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetToDefault}
          disabled={isResetting || isTesting}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          title="بازنشانی تمام فیلدها به مقادیر پیش‌فرض MongoDB"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'در حال بازنشانی...' : 'بازنشانی به پیش‌فرض'}</span>
        </button>
      </div>

      {/* Test Result */}
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

      {/* Form */}
      <form onSubmit={handleSaveAndConnect} className="space-y-4">
        {useUri ? (
          <div>
            <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1.5 text-xs">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>رشتـه اتصال کامل MongoDB (URI):</span>
            </label>
            <input
              type="text"
              required
              placeholder="mongodb://127.0.0.1:27017/clinic"
              value={config.uri}
              onChange={(e) => setConfig({ ...config, uri: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-left focus:bg-white focus:border-emerald-500 focus:outline-none"
              dir="ltr"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* Host */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>آدرس سرور (Host / IP):</span>
              </label>
              <input
                type="text"
                required
                placeholder="127.0.0.1"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-emerald-500 focus:outline-none"
                dir="ltr"
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                <span>پورت MongoDB (Port):</span>
              </label>
              <input
                type="number"
                required
                placeholder="27017"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 27017 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-emerald-500 focus:outline-none"
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
                placeholder="clinic"
                value={config.database}
                onChange={(e) => setConfig({ ...config, database: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-emerald-500 focus:outline-none"
                dir="ltr"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium">
                <span>نام کاربری (اختیاری):</span>
              </label>
              <input
                type="text"
                placeholder="بدون نام کاربری"
                value={config.username || ''}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-emerald-500 focus:outline-none"
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>رمز عبور (اختیاری):</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="بدون رمز عبور"
                  value={config.password || ''}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left focus:bg-white focus:border-emerald-500 focus:outline-none"
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


          </div>
        )}

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
              <span>{isTesting ? 'در حال بررسی...' : 'تست اتصال به MongoDB'}</span>
            </button>

            {/* Init Collections Button */}
            <button
              type="button"
              onClick={handleInitCollections}
              disabled={isInitializing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 rounded-xl text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isInitializing ? 'در حال ساخت کلوکشن‌ها...' : 'آماده‌سازی کلوکشن‌های دیتابیس clinic'}</span>
            </button>
          </div>

          {/* Save & Connect Button */}
          <button
            type="submit"
            disabled={isTesting}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-emerald-600/30 cursor-pointer disabled:opacity-60 active:scale-95"
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isTesting ? 'در حال اتصال به دیتابیس...' : 'ذخیره تنظیمات و اتصال به MongoDB'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
