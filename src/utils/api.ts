import { MySQLConfig } from '../types';

export interface DBTestResponse {
  success: boolean;
  message: string;
  version?: string;
  tablesCount?: number;
  databases?: string[];
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

export async function fetchMySQLConfig(): Promise<MySQLConfig | null> {
  try {
    const res = await fetch('/api/db/config');
    if (!res.ok) return null;
    const data = await res.json();
    return data.config || null;
  } catch (e) {
    console.warn('Backend API not reachable (offline/desktop mode)');
    return null;
  }
}

export async function saveMySQLConfig(config: MySQLConfig): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/db/config', {
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
    const res = await fetch('/api/db/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      message: `خطا در اتصال به سرور backend: ${e.message || 'سرور در دسترس نیست'}`,
    };
  }
}

export async function initMySQLTables(config: MySQLConfig): Promise<DBTestResponse> {
  try {
    const res = await fetch('/api/db/init-tables', {
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
    const res = await fetch('/api/db/load');
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در اتصال به پایگاه داده' };
  }
}

export async function syncClinicDataToMySQL(clinicData: any): Promise<DBSyncResponse> {
  try {
    const res = await fetch('/api/db/sync', {
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
    const res = await fetch('/api/db/clear', {
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
    const res = await fetch('/api/db/backup');
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'خطا در برقراری ارتباط جهت پشتیبان‌گیری دیتابیس' };
  }
}

