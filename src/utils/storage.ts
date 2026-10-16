import {
  Patient,
  ServiceDefinition,
  Operator,
  Admission,
  FollowUpReminder,
  Shareholder,
  ClinicSettings
} from '../types';
import {
  INITIAL_PATIENTS,
  INITIAL_SERVICES,
  INITIAL_OPERATORS,
  INITIAL_CONSUMABLES,
  INITIAL_SHAREHOLDERS,
  INITIAL_SETTINGS,
  INITIAL_ADMISSIONS,
  INITIAL_FOLLOW_UPS
} from './initialData';

const STORAGE_KEYS = {
  PATIENTS: 'clinic_patients_real_v3',
  SERVICES: 'clinic_services_v3_rial',
  OPERATORS: 'clinic_operators_v3',
  CONSUMABLES: 'clinic_consumables_v3_rial',
  SHAREHOLDERS: 'clinic_shareholders_v3',
  SETTINGS: 'clinic_settings_v3_rial',
  ADMISSIONS: 'clinic_admissions_real_v3',
  FOLLOW_UPS: 'clinic_followups_real_v3',
  LEGACY_CLEARED: 'clinic_legacy_mock_cleared_v3',
};

function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error loading key ${key}:`, e);
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key ${key}:`, e);
  }
}

export function loadAllClinicData() {
  // Purge any old mock data from previous version if not already cleared
  if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEYS.LEGACY_CLEARED)) {
    localStorage.removeItem('clinic_patients_v2');
    localStorage.removeItem('clinic_admissions_v2_rial');
    localStorage.removeItem('clinic_followups_v2');
    localStorage.setItem(STORAGE_KEYS.LEGACY_CLEARED, 'true');
  }

  const loadedServices = getStoredItem<ServiceDefinition[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const services = (loadedServices && loadedServices.length > 0) ? loadedServices : INITIAL_SERVICES;

  const patients = getStoredItem<Patient[]>(STORAGE_KEYS.PATIENTS, []);
  const admissions = getStoredItem<Admission[]>(STORAGE_KEYS.ADMISSIONS, []);
  const followUps = getStoredItem<FollowUpReminder[]>(STORAGE_KEYS.FOLLOW_UPS, []);

  // Filter out any leftover mock operators so only user-created operators exist
  const rawOps = getStoredItem<Operator[]>(STORAGE_KEYS.OPERATORS, []);
  const operators = rawOps.filter((o) => 
    !['op-1', 'op-2', 'op-3', 'op-4'].includes(o.id) &&
    !['دکتر حسن محمدی', 'دکتر حنانه پورسلطان', 'رعنا ایمانی', 'نوید مهدی نژاد'].includes(o.name)
  );

  // Filter out any leftover mock shareholders
  const rawShs = getStoredItem<Shareholder[]>(STORAGE_KEYS.SHAREHOLDERS, []);
  const shareholders = rawShs.filter((s) => 
    !['sh-1', 'sh-2'].includes(s.id) &&
    !['دکتر حسن محمدی', 'دکتر حنانه پورسلطان'].includes(s.name)
  );

  return {
    patients,
    services,
    operators,
    consumables: getStoredItem(STORAGE_KEYS.CONSUMABLES, INITIAL_CONSUMABLES),
    shareholders,
    settings: getStoredItem<ClinicSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    admissions,
    followUps,
  };
}

export function saveAllClinicData(data: {
  patients: Patient[];
  services: ServiceDefinition[];
  operators: Operator[];
  consumables: { name: string; cost: number }[];
  shareholders: Shareholder[];
  settings: ClinicSettings;
  admissions: Admission[];
  followUps: FollowUpReminder[];
}) {
  setStoredItem(STORAGE_KEYS.PATIENTS, data.patients);
  setStoredItem(STORAGE_KEYS.SERVICES, data.services);
  setStoredItem(STORAGE_KEYS.OPERATORS, data.operators);
  setStoredItem(STORAGE_KEYS.CONSUMABLES, data.consumables);
  setStoredItem(STORAGE_KEYS.SHAREHOLDERS, data.shareholders);
  setStoredItem(STORAGE_KEYS.SETTINGS, data.settings);
  setStoredItem(STORAGE_KEYS.ADMISSIONS, data.admissions);
  setStoredItem(STORAGE_KEYS.FOLLOW_UPS, data.followUps);
}

export function clearAllMockAndRealData() {
  localStorage.removeItem(STORAGE_KEYS.PATIENTS);
  localStorage.removeItem(STORAGE_KEYS.ADMISSIONS);
  localStorage.removeItem(STORAGE_KEYS.FOLLOW_UPS);
  localStorage.removeItem(STORAGE_KEYS.OPERATORS);
  localStorage.removeItem(STORAGE_KEYS.SHAREHOLDERS);
  localStorage.setItem(STORAGE_KEYS.LEGACY_CLEARED, 'true');
  return {
    ...loadAllClinicData(),
    patients: [],
    admissions: [],
    followUps: [],
    operators: [],
    shareholders: [],
  };
}

export function resetClinicDataToDemo() {
  return clearAllMockAndRealData();
}

export function exportClinicDataAsJSON(data: any): string {
  const settings = { ...(data.settings || {}) };
  delete settings.adminPin;
  delete settings.mongoConfig;

  return JSON.stringify({
    app: 'clinic-manager',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      patients: Array.isArray(data.patients) ? data.patients : [],
      services: Array.isArray(data.services) ? data.services : [],
      operators: Array.isArray(data.operators) ? data.operators : [],
      consumables: Array.isArray(data.consumables) ? data.consumables : [],
      shareholders: Array.isArray(data.shareholders) ? data.shareholders : [],
      settings,
      admissions: Array.isArray(data.admissions) ? data.admissions : [],
      followUps: Array.isArray(data.followUps) ? data.followUps : [],
    },
  }, null, 2);
}

export function parseClinicDataFromJSON(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString);
    const payload = parsed?.app === 'clinic-manager' && parsed?.data
      ? parsed.data
      : parsed;

    if (!payload || !Array.isArray(payload.patients) || !Array.isArray(payload.admissions)) {
      return null;
    }

    const current = loadAllClinicData();
    const importedSettings = payload.settings && typeof payload.settings === 'object'
      ? payload.settings
      : {};

    return {
      patients: payload.patients,
      services: Array.isArray(payload.services) ? payload.services : current.services,
      operators: Array.isArray(payload.operators) ? payload.operators : current.operators,
      consumables: Array.isArray(payload.consumables) ? payload.consumables : current.consumables,
      shareholders: Array.isArray(payload.shareholders) ? payload.shareholders : current.shareholders,
      admissions: payload.admissions,
      followUps: Array.isArray(payload.followUps) ? payload.followUps : [],
      settings: {
        ...current.settings,
        ...importedSettings,
        adminPin: current.settings.adminPin,
        mongoConfig: current.settings.mongoConfig,
      },
    };
  } catch {
    return null;
  }
}

export function importClinicDataFromJSON(jsonString: string) {
  const parsed = parseClinicDataFromJSON(jsonString);
  if (!parsed) return false;
  saveAllClinicData(parsed);
  return true;
}
