import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  DEFAULT_MONGO_CONFIG,
  testMongoConnection,
  loadClinicDataFromMongo,
  syncClinicDataToMongo,
  restoreClinicDataToMongo
} from './utils/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ReceptionView } from './components/Reception/ReceptionView';
import { PatientsView } from './components/Patients/PatientsView';
import { FollowUpsView } from './components/FollowUps/FollowUpsView';
import { ManagementView } from './components/Management/ManagementView';
import { InvoicesView } from './components/InvoicesView';
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
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);
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
      const testRes = await testMongoConnection(DEFAULT_MONGO_CONFIG);
      if (!testRes.success) {
        setDbStatus('disconnected');
        setIsMongoEnabled(false);
        if (!isInitial) addToast('اتصال به دیتابیس برقرار نشد. سرویس MongoDB را بررسی کنید.', 'error');
        return false;
      }

      const loadRes = await loadClinicDataFromMongo();
      if (!loadRes.success || !loadRes.data) {
        setDbStatus('disconnected');
        setIsMongoEnabled(false);
        if (!isInitial) addToast('اتصال برقرار شد اما بارگذاری اطلاعات دیتابیس ناموفق بود.', 'error');
        return false;
      }

      setClinicData((prev) => ({
        ...prev,
        ...loadRes.data,
        settings: {
          ...prev.settings,
          ...(loadRes.data.settings || {}),
          mongoConfig: DEFAULT_MONGO_CONFIG,
        },
      }));
      setIsMongoEnabled(true);
      setDbWarningDismissed(false);
      setDbStatus('connected');
      return true;
    } catch {
      setDbStatus('disconnected');
      setIsMongoEnabled(false);
      if (!isInitial) addToast('اتصال به دیتابیس برقرار نشد. سرویس MongoDB را بررسی کنید.', 'error');
      return false;
    }
  }, [addToast]);

  // Initial startup connection check
  useEffect(() => {
    checkDBConnection(true);
  }, [checkDBConnection]);

  // Persist the current clinic state locally so management settings (including the admin PIN)
  // remain available after restarting the desktop app, even when MongoDB is temporarily offline.
  useEffect(() => {
    saveAllClinicData(clinicData);
  }, [clinicData]);

  // Realtime auto-sync to MongoDB whenever clinicData changes
  useEffect(() => {
    if (!isRestoringBackup && isMongoEnabled && dbStatus === 'connected') {
      const timer = setTimeout(async () => {
        try {
          const res = await syncClinicDataToMongo(clinicData);
          if (!res.success) console.warn('Sync failed:', res.message);
        } catch (e) {
          console.warn('Auto-sync error:', e);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [clinicData, isMongoEnabled, dbStatus, isRestoringBackup]);

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

  // Guard against rapid double-clicks as well as already-saved duplicate invoices.
  const invoiceFingerprints = useRef<Map<string, number>>(new Map());
  const getInvoiceFingerprint = (admission: Admission) => JSON.stringify({
    patientId: admission.patientId,
    date: admission.date,
    serviceItems: (admission.serviceItems || []).map(item => ({
      serviceId: item.serviceId,
      serviceName: item.serviceName.trim().toLocaleLowerCase(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: item.totalAmount,
      details: item.details || {},
    })),
    serviceName: admission.serviceName.trim().toLocaleLowerCase(),
    basePrice: admission.basePrice,
    quantity: admission.quantity,
    discount: admission.discount,
    finalAmount: admission.finalAmount,
    consumables: (admission.consumables || []).map(item => ({ name: item.name, cost: item.cost })).sort((a,b) => a.name.localeCompare(b.name)),
    deposit: admission.deposit ? { amount: admission.deposit.amount, paymentMethod: admission.deposit.paymentMethod, scheduledDate: admission.deposit.scheduledDate, scheduledTime: admission.deposit.scheduledTime } : null,
  });

  // Actions
  const handleAdmissionCreated = (admission: Admission, reminder?: FollowUpReminder): boolean => {
    const fingerprint = getInvoiceFingerprint(admission);
    const previousAttemptAt = invoiceFingerprints.current.get(fingerprint);
    const duplicate = clinicData.admissions.some(existing =>
      existing.status !== 'cancelled' && getInvoiceFingerprint(existing) === fingerprint
    ) || (previousAttemptAt !== undefined && Date.now() - previousAttemptAt < 10000);
    if (duplicate) {
      addToast('این فاکتور کاملاً مشابه قبلاً ثبت شده است؛ از ثبت تکراری جلوگیری شد.', 'error');
      return false;
    }
    invoiceFingerprints.current.set(fingerprint, Date.now());
    setClinicData((prev) => ({
      ...prev,
      admissions: [admission, ...prev.admissions],
      followUps: reminder ? [reminder, ...prev.followUps] : prev.followUps,
    }));

    addToast(
      admission.registrationStatus === 'temporary'
        ? `پذیرش بیمار ${admission.patientName} به‌صورت موقت ثبت شد. می‌توانید از پرونده بیمار آن را ویرایش یا قطعی کنید.`
        : `پذیرش بیمار ${admission.patientName} با موفقیت ثبت شد.`,
      admission.registrationStatus === 'temporary' ? 'info' : 'success'
    );
    if (admission.registrationStatus !== 'temporary') setActiveReceiptAdmission(admission);
    setPreselectedPatientId(undefined);
    return true;
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

  const handleImportData = async (jsonStr: string): Promise<boolean> => {
    setIsRestoringBackup(true);
    try {
      const ok = importClinicDataFromJSON(jsonStr);
      if (!ok) return false;

      const restoredData = loadAllClinicData();
      setClinicData(restoredData);

      if (isMongoEnabled && dbStatus === 'connected') {
        const restoreResult = await restoreClinicDataToMongo(restoredData);
        if (!restoreResult.success) {
          addToast(`اطلاعات در برنامه بازیابی شد، اما بازیابی MongoDB ناموفق بود: ${restoreResult.message}`, 'error');
        } else {
          addToast('اطلاعات پشتیبان در برنامه و MongoDB بازیابی شد.');
        }
      } else {
        addToast('اطلاعات پشتیبان در برنامه بازیابی شد. برای بازیابی دیتابیس، ابتدا اتصال MongoDB را برقرار کنید.', 'info');
      }
      return true;
    } catch {
      addToast('خطا در خواندن یا بازیابی فایل پشتیبان.', 'error');
      return false;
    } finally {
      setIsRestoringBackup(false);
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
            className="clinic-mobile-drawer h-full w-64 border-l border-slate-200 bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
              {clinicData.settings.clinicName}
            </div>
            <div className="space-y-1">
              {[
                { id: 'dashboard' as TabType, label: 'داشبورد' },
                { id: 'reception' as TabType, label: 'پذیرش' },
                { id: 'patients' as TabType, label: 'پرونده بیماران' },
                { id: 'followups' as TabType, label: 'یادآوری مراجعات' },
                { id: 'invoices' as TabType, label: 'فاکتورها و بیعانه' },
                { id: 'management' as TabType, label: 'مدیریت مطب' },
                { id: 'settings' as TabType, label: 'تنظیمات' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`clinic-mobile-nav-item w-full rounded-lg p-2.5 text-right text-xs font-semibold ${
                    currentTab === item.id ? 'is-active' : ''
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
          onRetryConnection={() => checkDBConnection(false)}
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
                    اخطار: اتصال به دیتابیس MongoDB برقرار نیست!
                  </h4>
                  <p className="text-xs text-rose-800 mt-0.5">
                    برای ذخیره اطلاعات، اتصال پایگاه داده را بررسی کنید یا دوباره تلاش کنید.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => checkDBConnection(false)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  تلاش مجدد اتصال
                </button>
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

          {currentTab === 'invoices' && (
            <InvoicesView
              admissions={clinicData.admissions}
              patients={clinicData.patients}
              services={clinicData.services}
              operators={clinicData.operators}
              onAdmissionCreated={handleAdmissionCreated}
              onUpdateAdmission={handleUpdateAdmission}
              onUpdateFollowUpStatus={(admissionId, status, notes) => {
                setClinicData(prev => ({
                  ...prev,
                  followUps: prev.followUps.map(item =>
                    item.admissionId === admissionId
                      ? { ...item, status, notes: notes || item.notes }
                      : item
                  ),
                }));
              }}
              onToast={addToast}
              onPrintAdmission={adm => setActiveReceiptAdmission(adm)}
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
              clinicData={clinicData}
              onUpdateSettings={(settings) => {
                setClinicData((prev) => ({ ...prev, settings: { ...settings, mongoConfig: DEFAULT_MONGO_CONFIG } }));
                addToast('تنظیمات با موفقیت ذخیره شد.');
              }}
              onExportData={handleExportData}
              onImportData={handleImportData}
              onToast={addToast}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={clinicData.settings}
              onUpdateSettings={(settings) => {
                setClinicData((prev) => ({ ...prev, settings: { ...settings, mongoConfig: DEFAULT_MONGO_CONFIG } }));
                addToast('مشخصات مطب با موفقیت ذخیره شد.');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
