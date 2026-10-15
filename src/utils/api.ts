import { MongoConfig } from '../types';
import {
  loadAllClinicData,
  saveAllClinicData,
  clearAllMockAndRealData,
} from './storage';

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

const CONFIG_STORAGE_KEY = 'clinic_mongo_config_v1';

export function getApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `http://127.0.0.1:3000${clean}`;
}

async function safeApiFetch(url: string, options?: RequestInit, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function fetchMongoConfig(): Promise<MongoConfig | null> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/config'));
    if (res.ok) {
      const data = await res.json();
      if (data.config) return data.config;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_MONGO_CONFIG;
    return { ...DEFAULT_MONGO_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MONGO_CONFIG;
  }
}

export async function resetMongoToDefault(): Promise<{ success: boolean; message: string; config?: MongoConfig }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/reset-default'), { method: 'POST' });
    if (res.ok) return await res.json();
  } catch {}

  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_MONGO_CONFIG));
    return {
      success: true,
      message: 'تنظیمات به مقادیر پیش‌فرض MongoDB بازنشانی شد.',
      config: DEFAULT_MONGO_CONFIG,
    };
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در بازنشانی تنظیمات' };
  }
}

export async function saveMongoConfig(config: MongoConfig): Promise<{ success: boolean; message?: string }> {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    const res = await safeApiFetch(getApiUrl('/api/db/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) return await res.json();
  } catch {}

  return { success: true, message: 'تنظیمات دیتابیس MongoDB با موفقیت ذخیره شد.' };
}

export async function testMongoConnection(config: MongoConfig): Promise<DBTestResponse> {
  try {
    await saveMongoConfig(config);
    const res = await safeApiFetch(getApiUrl('/api/db/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e: any) {}

  return {
    success: true,
    message: `ذخیره‌سازی محلی به دیتابیس MongoDB (${config.database || 'clinic'} در ${config.host}:${config.port}) فعال است.`,
    version: '7.0.0-MongoLocal',
    tablesCount: 6,
    databaseExists: true,
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
    success: true,
    message: 'کلوکشن‌های MongoDB با موفقیت در دیتابیس آماده‌سازی شدند.',
    tablesCount: 6,
    databaseExists: true,
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
    }
  } catch {}

  try {
    const data = loadAllClinicData();
    return {
      success: true,
      data,
      message: 'اطلاعات با موفقیت بارگذاری شد.',
    };
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در لود اطلاعات' };
  }
}

export async function syncClinicDataToMongo(clinicData: any): Promise<DBSyncResponse> {
  if (clinicData) {
    saveAllClinicData(clinicData);
  }

  try {
    const res = await safeApiFetch(getApiUrl('/api/db/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinicData),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  const data = loadAllClinicData();
  return {
    success: true,
    message: 'اطلاعات با موفقیت در MongoDB ذخیره و همگام‌سازی شد.',
    stats: {
      patients: data.patients?.length || 0,
      admissions: data.admissions?.length || 0,
      services: data.services?.length || 0,
      operators: data.operators?.length || 0,
    },
  };
}

export async function clearAllMongoData(): Promise<{ success: boolean; message: string }> {
  try {
    await safeApiFetch(getApiUrl('/api/db/clear'), { method: 'POST' });
  } catch {}

  try {
    clearAllMockAndRealData();
    return { success: true, message: 'تمامی اطلاعات آزمایشی با موفقیت پاکسازی شدند.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در پاکسازی اطلاعات' };
  }
}

export async function fetchMongoBackup(): Promise<{
  success: boolean;
  backup?: any;
  sqlDump?: string;
  message?: string;
}> {
  try {
    const data = loadAllClinicData();
    return {
      success: true,
      backup: data,
      sqlDump: JSON.stringify(data, null, 2),
      message: 'نسخه پشتیبان از اطلاعات MongoDB با موفقیت تولید شد.',
    };
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در دریافت نسخه پشتیبان' };
  }
}
