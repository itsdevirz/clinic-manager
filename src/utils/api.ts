import { MySQLConfig } from '../types';

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

export const DEFAULT_MYSQL_CONFIG: MySQLConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'clinic_db',
  enabled: true,
};

/**
 * Resolves the API URL for both web and desktop (Tauri) environments.
 * In desktop mode (tauri.localhost / tauri://), requests target http://127.0.0.1:3000.
 */
export function getApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (typeof window === 'undefined') {
    return `http://127.0.0.1:3000${clean}`;
  }

  const w = window as any;
  const origin = window.location.origin;
  const isDesktopTauri =
    Boolean(w.__TAURI_INTERNALS__) ||
    Boolean(w.__TAURI__) ||
    origin.includes('tauri.localhost') ||
    origin.startsWith('tauri://') ||
    origin.startsWith('file:') ||
    origin === 'null' ||
    (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') ||
    (window.location.hostname === 'localhost' && window.location.port !== '3000' && window.location.port !== '');

  if (isDesktopTauri) {
    return `http://127.0.0.1:3000${clean}`;
  }

  return clean;
}

/**
 * Resilient fetch wrapper with retry logic for desktop environments
 * where the local Express background server may take 1-2 seconds to finish starting.
 */
async function safeApiFetch(url: string, options?: RequestInit, retries = 3, delayMs = 500): Promise<Response> {
  let currentUrl = url;
  let lastError: any = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(currentUrl, options);
      return res;
    } catch (err: any) {
      lastError = err;
      const isLocalDesktop =
        currentUrl.includes('127.0.0.1:3000') ||
        currentUrl.includes('localhost:3000');

      if (isLocalDesktop && attempt < retries - 1) {
        // Swap between 127.0.0.1 and localhost on alternate retries
        if (currentUrl.includes('127.0.0.1:3000')) {
          currentUrl = currentUrl.replace('127.0.0.1:3000', 'localhost:3000');
        } else if (currentUrl.includes('localhost:3000')) {
          currentUrl = currentUrl.replace('localhost:3000', '127.0.0.1:3000');
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

export async function fetchMySQLConfig(): Promise<MySQLConfig | null> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/config'));
    if (!res.ok) return null;
    const data = await res.json();
    return data.config || null;
  } catch {
    return null;
  }
}

export async function resetMySQLToDefault(): Promise<{ success: boolean; message: string; config?: MySQLConfig }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/reset-default'), { method: 'POST' });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در بازنشانی تنظیمات دیتابیس' };
  }
}

export async function saveMySQLConfig(config: MySQLConfig): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در برقراری ارتباط با سرور برنامه' };
  }
}

export async function testMySQLConnection(config: MySQLConfig): Promise<DBTestResponse> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      message: `خطا در اتصال به سرور backend (پورت ۳۰۰۰): ${e.message || 'سرور محلی در دسترس نیست'}. در صورت نیاز، فایل start-clinic.bat را یک‌بار باز کنید.`,
    };
  }
}

export async function initMySQLTables(config: MySQLConfig): Promise<DBTestResponse> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/init-tables'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      message: `خطا در ایجاد جداول دیتابیس: ${e.message}`,
    };
  }
}

export async function loadClinicDataFromMySQL(): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/load'));
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در اتصال به پایگاه داده' };
  }
}

export async function syncClinicDataToMySQL(clinicData: any): Promise<DBSyncResponse> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinicData),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در ارسال اطلاعات به سرور MySQL' };
  }
}

export async function clearAllMySQLData(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/clear'), {
      method: 'POST',
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در پاکسازی دیتابیس' };
  }
}

export async function fetchMySQLBackup(): Promise<{
  success: boolean;
  backup?: any;
  sqlDump?: string;
  message?: string;
}> {
  try {
    const res = await safeApiFetch(getApiUrl('/api/db/backup'));
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در برقراری ارتباط جهت پشتیبان‌گیری دیتابیس' };
  }
}
