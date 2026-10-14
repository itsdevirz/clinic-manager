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
  PATIENTS: 'clinic_patients_v2',
  SERVICES: 'clinic_services_v2_rial',
  OPERATORS: 'clinic_operators_v2',
  CONSUMABLES: 'clinic_consumables_v2_rial',
  SHAREHOLDERS: 'clinic_shareholders_v2',
  SETTINGS: 'clinic_settings_v2_rial',
  ADMISSIONS: 'clinic_admissions_v2_rial',
  FOLLOW_UPS: 'clinic_followups_v2',
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
  const loadedServices = getStoredItem<ServiceDefinition[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  // Auto-upgrade if old list is smaller than the comprehensive 63-service list
  const services = (loadedServices && loadedServices.length >= 35) ? loadedServices : INITIAL_SERVICES;

  const loadedPatients = getStoredItem<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
  const patients = (loadedPatients && loadedPatients.length >= 10) ? loadedPatients : INITIAL_PATIENTS;

  const loadedAdmissions = getStoredItem<Admission[]>(STORAGE_KEYS.ADMISSIONS, INITIAL_ADMISSIONS);
  const admissions = (loadedAdmissions && loadedAdmissions.length >= 10) ? loadedAdmissions : INITIAL_ADMISSIONS;

  return {
    patients,
    services,
    operators: getStoredItem<Operator[]>(STORAGE_KEYS.OPERATORS, INITIAL_OPERATORS),
    consumables: getStoredItem(STORAGE_KEYS.CONSUMABLES, INITIAL_CONSUMABLES),
    shareholders: getStoredItem<Shareholder[]>(STORAGE_KEYS.SHAREHOLDERS, INITIAL_SHAREHOLDERS),
    settings: getStoredItem<ClinicSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    admissions,
    followUps: getStoredItem<FollowUpReminder[]>(STORAGE_KEYS.FOLLOW_UPS, INITIAL_FOLLOW_UPS),
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

export function resetClinicDataToDemo() {
  localStorage.removeItem(STORAGE_KEYS.PATIENTS);
  localStorage.removeItem(STORAGE_KEYS.SERVICES);
  localStorage.removeItem(STORAGE_KEYS.OPERATORS);
  localStorage.removeItem(STORAGE_KEYS.CONSUMABLES);
  localStorage.removeItem(STORAGE_KEYS.SHAREHOLDERS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.ADMISSIONS);
  localStorage.removeItem(STORAGE_KEYS.FOLLOW_UPS);
  return loadAllClinicData();
}

export function exportClinicDataAsJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

export function importClinicDataFromJSON(jsonString: string) {
  const parsed = JSON.parse(jsonString);
  if (parsed.patients && parsed.admissions) {
    saveAllClinicData(parsed);
    return true;
  }
  return false;
}
