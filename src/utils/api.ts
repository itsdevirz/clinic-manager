import { MongoConfig } from '../types';

export interface DBTestResponse {
  success: boolean;
  message: string;
  version?: string;
  tablesCount?: number;
  databases?: string[];
  databaseExists?: boolean;
}

export interface DBSyncResponse {
  success: boolean;
  message: string;
  stats?: {
    patients: number;
    admissions: number;
    services: number;
    operators: number;
  };
}

export const DEFAULT_MONGO_CONFIG: MongoConfig = {
  uri: 'mongodb://127.0.0.1:27017/clinic',
  host: '127.0.0.1',
  port: 27017,
  database: 'clinic',
  username: '',
  password: '',
  enabled: true,
};

export function getApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `http://127.0.0.1:3000${clean}`;
}

async function safeApiFetch(url: string, options?: RequestInit, retries = 6, delayMs = 500): Promise<Response> {
  let lastError: any = null;
  let currentUrl = url;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(currentUrl, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      lastError = err;

      if (currentUrl.includes('127.0.0.1:3000')) {
        currentUrl = currentUrl.replace('127.0.0.1:3000', 'localhost:3000');
      } else if (currentUrl.includes('localhost:3000')) {
        currentUrl = currentUrl.replace('localhost:3000', '127.0.0.1:3000');
      }

      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
    }
  }
  throw lastError;
}

export async function fetchMongoConfig(): Promise<MongoConfig> {
  return { ...DEFAULT_MONGO_CONFIG };
}

export async function resetMongoToDefault(): Promise<{ success: boolean; message: string; config?: MongoConfig }> {
  return {
    success: true,
    message: 'اتصال ثابت به دیتابیس clinic فعال است.',
    config: { ...DEFAULT_MONGO_CONFIG },
  };
}

export async function saveMongoConfig(_config: MongoConfig): Promise<{ success: boolean; message?: string }> {
  return {
    success: false,
    message: 'تنظیمات اتصال دیتابیس توسط برنامه مدیریت می‌شود و قابل تغییر نیست.',
  };
}

export async function testMongoConnection(config: MongoConfig): Promise<DBTestResponse> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e: any) {
    return {
      success: false,
      message: `خطا در برقراری ارتباط با سرویس داخلی برنامه: ${e?.message || 'پاسخی دریافت نشد'}. لطفاً مطمئن شوید سرویس MongoDB روی سیستم فعال است.`,
    };
  }

  return {
    success: false,
    message: `عدم برقراری ارتباط با سرور MongoDB. بررسی کنید سرویس MongoDB روی ${config.host || '127.0.0.1'}:${config.port || 27017} یا آدرس URI فعال باشد.`,
  };
}

export async function initMongoCollections(config: MongoConfig): Promise<DBTestResponse> {
  try {
    await saveMongoConfig({ ...config, enabled: true });
    const res = await safeApiFetch(getApiUrl('/api/db/init-tables'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return {
    success: false,
    message: 'خطا در ساخت کلوکشن‌ها. ابتدا از فعال بودن دیتابیس MongoDB اطمینان حاصل فرمایید.',
  };
}

export async function loadClinicDataFromMongo(): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/load'));
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data) {
        return result;
      }
      return { success: false, message: result.message || 'خطا در بارگذاری اطلاعات از MongoDB' };
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'عدم دسترسی به سرور پایگاه داده' };
  }

  return { success: false, message: 'سرور دیتابیس MongoDB پاسخگو نیست.' };
}

export async function syncClinicDataToMongo(clinicData: any): Promise<DBSyncResponse> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinicData),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در همگام‌سازی با MongoDB' };
  }

  return { success: false, message: 'خطا در برقراری ارتباط با MongoDB' };
}

export async function restoreClinicDataToMongo(clinicData: any): Promise<{ success: boolean; message: string }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/restore'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinicData),
    });
    const result = await res.json();
    if (res.ok) return result;
    return { success: false, message: result.message || 'بازیابی پشتیبان در MongoDB ناموفق بود.' };
  } catch (e: any) {
    return { success: false, message: e?.message || 'ارتباط با سرویس بک‌اند برقرار نشد.' };
  }
}

export async function clearAllMongoData(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/clear'), { method: 'POST' });
    if (res.ok) return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در پاکسازی MongoDB' };
  }
  return { success: false, message: 'امکان ارتباط با MongoDB وجود ندارد' };
}
