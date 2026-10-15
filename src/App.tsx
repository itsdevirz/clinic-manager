import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Patient,
  ServiceDefinition,
  Operator,
  Admission,
  FollowUpReminder,
  Shareholder,
  ClinicSettings,
  TabType,
  FollowUpStatus
} from './types';
import {
  loadAllClinicData,
  saveAllClinicData,
  resetClinicDataToDemo,
  clearAllMockAndRealData,
  exportClinicDataAsJSON,
  importClinicDataFromJSON
} from './utils/storage';
import {
  fetchMongoConfig,
  testMongoConnection,
  loadClinicDataFromMongo,
  syncClinicDataToMongo
} from './utils/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ReceptionView } from './components/Reception/ReceptionView';
import { PatientsView } from './components/Patients/PatientsView';
import { FollowUpsView } from './components/FollowUps/FollowUpsView';
import { ManagementView } from './components/Management/ManagementView';
import { SettingsView } from './components/Settings/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { PatientDossierModal } from './components/Patients/PatientDossierModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { SearchModal } from './components/SearchModal';
import { getTodayPersianDate } from './utils/persianDate';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  // Main loaded state
  const [clinicData, setClinicData] = useState(() => loadAllClinicData());

  // UI state
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isMongoEnabled, setIsMongoEnabled] = useState<boolean>(false);

  // Database Connection & Realtime Auto-Sync State
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [dbWarningDismissed, setDbWarningDismissed] = useState<boolean>(false);

  // Modals & Navigation triggers
  const [activeReceiptAdmission, setActiveReceiptAdmission] = useState<Admission | null>(null);
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | undefined>(undefined);
  const [activeDossierPatientId, setActiveDossierPatientId] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check MongoDB connection and load data on startup
  const checkDBConnection = useCallback(async (isInitial = false) => {
    setDbStatus('checking');
    try {
      const cfg = await fetchMongoConfig();
      if (!cfg || !cfg.enabled) {
        setDbStatus('disconnected');
        setIsMongoEnabled(false);
        return false;
      }

      // Test connection
      const testRes = await testMongoConnection(cfg);
      if (!testRes.success) {
        setDbStatus('disconnected');
        setIsMongoEnabled(false);
        if (!isInitial) {
          addToast(`⚠️ اخطار: عدم اتصال به دیتابیس MongoDB: ${testRes.message}`, 'error');
        }
        return false;
      }

      // Successfully connected!
      setDbStatus('connected');
      setIsMongoEnabled(true);
      setDbWarningDismissed(false);

      const loadRes = await loadClinicDataFromMongo();
      if (loadRes.success && loadRes.data) {
        setClinicData((prev) => ({
          ...prev,
          ...loadRes.data,
          settings: {
            ...prev.settings,
            ...(loadRes.data.settings || {}),
            mongoConfig: cfg,
          },
        }));
        const nowStr = new Date().toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSyncTime(nowStr);
        if (isInitial) {
          addToast('اتصال به پایگاه داده MongoDB (دیتابیس clinic) برقرار شد.', 'success');
        }
      }
      return true;
    } catch (e: any) {
      setDbStatus('disconnected');
      setIsMongoEnabled(false);
      if (!isInitial) {
        addToast('⚠️ اخطار: اتصال به پایگاه داده MongoDB برقرار نشد!', 'error');
      }
      return false;
    }
  }, [addToast]);

  // Initial startup connection check
  useEffect(() => {
    checkDBConnection(true);
  }, [checkDBConnection]);

  // Save to localStorage and auto-sync to MongoDB whenever clinicData changes
  useEffect(() => {
    saveAllClinicData(clinicData);

    if (isMongoEnabled && dbStatus === 'connected') {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        try {
          const res = await syncClinicDataToMongo(clinicData);
          if (res.success) {
            const nowStr = new Date().toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            setLastSyncTime(nowStr);
          }
        } catch (e) {
          console.warn('Auto-sync error:', e);
        } finally {
          setIsSyncing(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [clinicData, isMongoEnabled, dbStatus]);

  // Global Ctrl+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute overdue count for notification badge in sidebar
  const today = getTodayPersianDate();
  const overdueFollowUpsCount = useMemo(() => {
    return clinicData.followUps.filter(
      (f) => (f.status === 'overdue' || (f.scheduledDate < today && f.status === 'pending'))
    ).length;
  }, [clinicData.followUps, today]);

  // Actions
  const handleAdmissionCreated = (admission: Admission, reminder?: FollowUpReminder) => {
    setClinicData((prev) => ({
      ...prev,
      admissions: [admission, ...prev.admissions],
      followUps: reminder ? [reminder, ...prev.followUps] : prev.followUps,
    }));

    addToast(`پذیرش بیمار ${admission.patientName} با موفقیت ثبت شد.`);
    setActiveReceiptAdmission(admission);
    setPreselectedPatientId(undefined);
  };

  const handlePatientCreated = (patient: Patient) => {
    setClinicData((prev) => ({
      ...prev,
      patients: [patient, ...prev.patients],
    }));
    addToast(`پرونده بیمار ${patient.firstName} ${patient.lastName} ایجاد شد.`);
  };

  const handleUpdatePatient = (updated: Patient) => {
    setClinicData((prev) => ({
      ...prev,
      patients: prev.patients.map((p) => (p.id === updated.id ? updated : p)),
    }));
    addToast('پرونده بیمار با موفقیت به‌روزرسانی شد.');
  };

  const handleUpdateAdmission = (updated: Admission) => {
    setClinicData((prev) => ({
      ...prev,
      admissions: prev.admissions.map((a) => (a.id === updated.id ? updated : a)),
    }));
    addToast(`اطلاعات و مبالغ پذیرش ${updated.patientName} با موفقیت به‌روزرسانی شد.`);
  };

  const handleUpdateFollowUpStatus = (id: string, status: FollowUpStatus, notes?: string, newDate?: string) => {
    setClinicData((prev) => ({
      ...prev,
      followUps: prev.followUps.map((f) =>
        f.id === id
          ? {
              ...f,
              status,
              notes: notes !== undefined ? notes : f.notes,
              scheduledDate: newDate || f.scheduledDate,
            }
          : f
      ),
    }));
    addToast('وضعیت و تاریخ پیگیری با موفقیت به‌روزرسانی شد.');
  };

  const handleOpenReceptionForPatient = (patientId?: string) => {
    setPreselectedPatientId(patientId);
    setCurrentTab('reception');
    setActiveDossierPatientId(null);
  };

  const handleOpenPatientDossier = (patientId: string) => {
    setActiveDossierPatientId(patientId);
  };

  const handleExportData = () => {
    const jsonStr = exportClinicDataAsJSON(clinicData);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinic-backup-${getTodayPersianDate().replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('فایل پشتیبان با موفقیت دانلود شد.');
  };

  const handleImportData = (jsonStr: string) => {
    try {
      const ok = importClinicDataFromJSON(jsonStr);
      if (ok) {
        setClinicData(loadAllClinicData());
        addToast('اطلاعات با موفقیت بازیابی شد.');
        return true;
      }
      return false;
    } catch (e) {
      addToast('خطا در خواندن فایل پشتیبان.', 'error');
      return false;
    }
  };

  const handleResetDemoData = () => {
    const reset = resetClinicDataToDemo();
    setClinicData(reset);
    addToast('داده‌ها به حالت پیش‌فرض اولیه بازنشانی شدند.');
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-800 flex ${activeReceiptAdmission ? 'has-receipt-modal' : ''}`}>
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        admission={activeReceiptAdmission}
        settings={clinicData.settings}
        onClose={() => setActiveReceiptAdmission(null)}
      />

      {/* Global Patient Dossier Modal Pop-up */}
      <PatientDossierModal
        patientId={activeDossierPatientId}
        onClose={() => setActiveDossierPatientId(null)}
        patients={clinicData.patients}
        admissions={clinicData.admissions}
        followUps={clinicData.followUps}
        operators={clinicData.operators}
        onOpenReceptionForPatient={(patientId) => {
          handleOpenReceptionForPatient(patientId);
          setActiveDossierPatientId(null);
        }}
        onUpdatePatient={handleUpdatePatient}
        onPrintAdmission={(adm) => setActiveReceiptAdmission(adm)}
        onUpdateAdmission={handleUpdateAdmission}
      />

      {/* Global Quick Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        patients={clinicData.patients}
        onSelectPatient={handleOpenPatientDossier}
        onOpenReceptionForPatient={handleOpenReceptionForPatient}
      />

      {/* Sidebar for Desktop */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setMobileMenuOpen(false);
        }}
        overdueCount={overdueFollowUpsCount}
        isUnlocked={isUnlocked}
        clinicName={clinicData.settings.clinicName}
      />

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 bg-white h-full p-4 border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100">
              {clinicData.settings.clinicName}
            </div>
            <div className="space-y-1">
              {[
                { id: 'dashboard' as TabType, label: 'داشبورد' },
                { id: 'reception' as TabType, label: 'پذیرش' },
                { id: 'patients' as TabType, label: 'پرونده بیماران' },
                { id: 'followups' as TabType, label: 'یادآوری مراجعات' },
                { id: 'management' as TabType, label: 'مدیریت مطب' },
                { id: 'settings' as TabType, label: 'تنظیمات' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-right p-2.5 rounded-lg text-xs font-semibold ${
                    currentTab === item.id
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-200 mr-0 md:mr-64">
        <Header
          currentTab={currentTab}
          onOpenReception={() => {
            setPreselectedPatientId(undefined);
            setCurrentTab('reception');
          }}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          isUnlocked={isUnlocked}
          onToggleLock={() => {
            if (isUnlocked) {
              setIsUnlocked(false);
              addToast('بخش مدیریت قفل شد.', 'info');
            } else {
              setCurrentTab('management');
            }
          }}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          dbStatus={dbStatus}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          onRetryConnection={() => checkDBConnection(false)}
          onOpenDBSettings={() => setCurrentTab('settings')}
        />

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {/* Warning Banner when Database is Disconnected */}
          {dbStatus === 'disconnected' && !dbWarningDismissed && (
            <div className="mb-6 bg-gradient-to-r from-rose-50 via-rose-100/60 to-rose-50 border border-rose-300 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-950 text-xs sm:text-sm flex items-center gap-1.5">
                    اخطار: برنامه به پایگاه داده MongoDB (clinic) متصل نیست!
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setDbWarningDismissed(true)}
                  className="p-1.5 text-rose-500 hover:text-rose-800 rounded-lg transition-colors cursor-pointer"
                  title="بستن این پیام"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              admissions={clinicData.admissions}
              followUps={clinicData.followUps}
              patients={clinicData.patients}
              operators={clinicData.operators}
              onOpenReceptionForPatient={handleOpenReceptionForPatient}
              onOpenPatientDossier={handleOpenPatientDossier}
              onPrintAdmission={(adm) => setActiveReceiptAdmission(adm)}
              onUpdateAdmission={handleUpdateAdmission}
              onNavigateToFollowUps={() => setCurrentTab('followups')}
            />
          )}

          {currentTab === 'reception' && (
            <ReceptionView
              patients={clinicData.patients}
              services={clinicData.services}
              operators={clinicData.operators}
              consumablesList={clinicData.consumables}
              preselectedPatientId={preselectedPatientId}
              onAdmissionCreated={handleAdmissionCreated}
              onPatientCreated={handlePatientCreated}
              onOpenPatientDossier={handleOpenPatientDossier}
            />
          )}

          {currentTab === 'patients' && (
            <PatientsView
              patients={clinicData.patients}
              admissions={clinicData.admissions}
              followUps={clinicData.followUps}
              onOpenReceptionForPatient={handleOpenReceptionForPatient}
              onOpenPatientDossier={handleOpenPatientDossier}
              onPatientCreated={handlePatientCreated}
              onUpdatePatient={handleUpdatePatient}
            />
          )}

          {currentTab === 'followups' && (
            <FollowUpsView
              followUps={clinicData.followUps}
              onUpdateFollowUpStatus={handleUpdateFollowUpStatus}
              onOpenReceptionForPatient={handleOpenReceptionForPatient}
              onOpenPatientDossier={handleOpenPatientDossier}
            />
          )}

          {currentTab === 'management' && (
            <ManagementView
              isUnlocked={isUnlocked}
              onUnlockSuccess={() => {
                setIsUnlocked(true);
                addToast('احراز هویت مدیریت تایید شد.');
              }}
              onLockSession={() => {
                setIsUnlocked(false);
                addToast('پنل مدیریت قفل شد.', 'info');
              }}
              settings={clinicData.settings}
              services={clinicData.services}
              operators={clinicData.operators}
              admissions={clinicData.admissions}
              shareholders={clinicData.shareholders}
              consumablesList={clinicData.consumables}
              onUpdateServices={(services) =>
                setClinicData((prev) => ({ ...prev, services }))
              }
              onUpdateOperators={(operators) =>
                setClinicData((prev) => ({ ...prev, operators }))
              }
              onUpdateShareholders={(shareholders) =>
                setClinicData((prev) => ({ ...prev, shareholders }))
              }
              onUpdateConsumables={(consumables) =>
                setClinicData((prev) => ({ ...prev, consumables }))
              }
              onPrintAdmission={(adm) => setActiveReceiptAdmission(adm)}
              onUpdateAdmission={handleUpdateAdmission}
              patients={clinicData.patients}
              onOpenPatientDossier={handleOpenPatientDossier}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={clinicData.settings}
              clinicData={clinicData}
              onUpdateSettings={(settings) => {
                setClinicData((prev) => ({ ...prev, settings }));
                if (settings.mongoConfig?.enabled !== undefined) {
                  setIsMongoEnabled(settings.mongoConfig.enabled);
                }
                addToast('تنظیمات با موفقیت ذخیره شد.');
              }}
              onExportData={handleExportData}
              onImportData={handleImportData}
              onResetDemoData={handleResetDemoData}
              onDataLoadedFromMongo={(newData) => {
                setClinicData((prev) => ({ ...prev, ...newData }));
                setIsMongoEnabled(true);
                setDbStatus('connected');
                const nowStr = new Date().toLocaleTimeString('fa-IR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                setLastSyncTime(nowStr);
              }}
              onClearLocalAndDBData={() => {
                const fresh = clearAllMockAndRealData();
                setClinicData(fresh);
              }}
              onToast={addToast}
              onRefreshAppConnection={() => checkDBConnection(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
