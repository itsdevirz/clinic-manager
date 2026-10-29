import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Calendar,
  CreditCard,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  Clock,
  Layers,
  Percent,
  Calculator,
  UserCheck,
  Tag,
  DollarSign,
  Edit3,
  Check,
  FileText,
  UserX
} from 'lucide-react';
import {
  Patient,
  ServiceDefinition,
  Operator,
  Admission,
  AdmissionServiceItem,
  FollowUpReminder,
  PaymentMethod,
  ChequeDetails,
  ServiceCategory,
  MainDepartmentId,
  getServiceMainDepartment
} from '../../types';
import {
  getTodayPersianDate,
  addDaysToPersianDate,
  formatToman,
  formatTomanActual,
  numberToPersianWordsToman,
  formatPersianDateReadable
} from '../../utils/persianDate';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { getApiUrl } from '../../utils/api';

interface ReceptionViewProps {
  patients: Patient[];
  services: ServiceDefinition[];
  operators: Operator[];
  consumablesList: { name: string; cost: number }[];
  preselectedPatientId?: string;
  onAdmissionCreated: (admission: Admission, reminder?: FollowUpReminder) => void;
  onPatientCreated?: (patient: Patient) => void;
  onOpenPatientDossier: (patientId: string) => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({
  patients: incomingPatients,
  services: incomingServices,
  operators: incomingOperators,
  consumablesList: incomingConsumablesList,
  preselectedPatientId,
  onAdmissionCreated,
  onOpenPatientDossier,
}) => {
  // Database data can be temporarily incomplete while the packaged app initializes.
  // Normalize collection props so the reception screen never crashes on missing arrays.
  const patients = Array.isArray(incomingPatients) ? incomingPatients : [];
  const services = Array.isArray(incomingServices) ? incomingServices : [];
  const operators = Array.isArray(incomingOperators) ? incomingOperators : [];
  const consumablesList = Array.isArray(incomingConsumablesList) ? incomingConsumablesList : [];
  const today = getTodayPersianDate();

  // Step 1: Patient Selection (Patients are created only in Patient Dossier)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Step 2: Service Selection & Customization (۳ خدمت اصلی کلینیک)
  const [selectedDepartment, setSelectedDepartment] = useState<MainDepartmentId>('beauty');
  const [serviceSubFilter, setServiceSubFilter] = useState<string>('all');
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');

  // Department counts
  const beautyCount = useMemo(
    () => services.filter((s) => getServiceMainDepartment(s.category) === 'beauty').length,
    [services]
  );
  const laserWomenCount = useMemo(
    () => services.filter((s) => s.category === 'laser_women').length,
    [services]
  );
  const laserMenCount = useMemo(
    () => services.filter((s) => s.category === 'laser_men').length,
    [services]
  );

  // All services belonging strictly to the selected main department
  const departmentServices = useMemo(() => {
    return services.filter((srv) => getServiceMainDepartment(srv.category) === selectedDepartment);
  }, [services, selectedDepartment]);

  const filteredServices = useMemo(() => {
    return departmentServices.filter((srv) => {
      // Sub-filter inside the selected department
      if (serviceSubFilter !== 'all') {
        if (selectedDepartment === 'beauty') {
          if (serviceSubFilter === 'botox_filler' && srv.category !== 'botox' && srv.category !== 'filler' && srv.category !== 'mesogel') return false;
          if (serviceSubFilter === 'meso_prp' && srv.category !== 'mesotherapy' && srv.category !== 'prp') return false;
          if (serviceSubFilter === 'hifu' && srv.category !== 'hifu') return false;
          if (serviceSubFilter === 'surgery' && srv.category !== 'surgery') return false;
          if (serviceSubFilter === 'carbon_qswitch' && srv.category !== 'carbon' && srv.category !== 'tattoo_face' && srv.category !== 'tattoo_body') return false;
          if (serviceSubFilter === 'skin_other' && srv.category !== 'mole' && srv.category !== 'white_hair' && srv.category !== 'piercing' && srv.category !== 'visit') return false;
        } else if (selectedDepartment === 'laser_women') {
          const isPackage = srv.name.includes('توتال') || srv.name.includes('فول') || srv.name.includes('کاربردی') || srv.name.includes('اقتصادی') || srv.name.includes('استخری') || srv.name.includes('کمر به پایین');
          if (serviceSubFilter === 'packages' && !isPackage) return false;
          if (serviceSubFilter === 'single_areas' && isPackage) return false;
        } else if (selectedDepartment === 'laser_men') {
          const isPackage = srv.name.includes('توتال') || srv.name.includes('فول') || srv.name.includes('بالاتنه') || srv.name.includes('سینه، شکم');
          if (serviceSubFilter === 'packages' && !isPackage) return false;
          if (serviceSubFilter === 'single_areas' && isPackage) return false;
        }
      }

      // Text query match within department
      if (serviceSearchQuery.trim()) {
        const q = serviceSearchQuery.trim().toLowerCase();
        return srv.name.toLowerCase().includes(q) || srv.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [departmentServices, selectedDepartment, serviceSubFilter, serviceSearchQuery]);

  const [selectedServicesCart, setSelectedServicesCart] = useState<AdmissionServiceItem[]>([]);
  const [draftAlreadyAdded, setDraftAlreadyAdded] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => {
    const initialDeptServices = services.filter((s) => getServiceMainDepartment(s.category) === 'beauty');
    return initialDeptServices[0]?.id || services[0]?.id || '';
  });

  const selectedService = useMemo(() => {
    const found = services.find((s) => s.id === selectedServiceId);
    if (found && getServiceMainDepartment(found.category) === selectedDepartment) {
      return found;
    }
    return departmentServices[0] || services[0];
  }, [services, selectedServiceId, selectedDepartment, departmentServices]);

  // Handler to switch department and bring up its corresponding services
  const handleSelectDepartment = (dept: MainDepartmentId) => {
    setDraftAlreadyAdded(false);
    setSelectedDepartment(dept);
    setServiceSubFilter('all');
    setServiceSearchQuery('');
    const targetDeptServices = services.filter((s) => getServiceMainDepartment(s.category) === dept);
    if (targetDeptServices.length > 0) {
      const isAlreadyInDept = targetDeptServices.some((s) => s.id === selectedServiceId);
      if (!isAlreadyInDept) {
        setSelectedServiceId(targetDeptServices[0].id);
      }
    }
  };

  // Service specific custom fields
  const [customServiceName, setCustomServiceName] = useState('');
  const [isCustomServiceMode, setIsCustomServiceMode] = useState<boolean>(false);
  const [customServiceDept, setCustomServiceDept] = useState<MainDepartmentId>('beauty');

  // Pricing mode & customizable fields
  const [isCustomPriceActive, setIsCustomPriceActive] = useState<boolean>(false);
  const [pricingCustomType, setPricingCustomType] = useState<'per_unit' | 'fixed_total'>('per_unit');
  const [unitPriceToman, setUnitPriceToman] = useState<number>(() => Math.round((services[0]?.defaultPrice || 0) / 10));
  const [totalPriceToman, setTotalPriceToman] = useState<number>(() => Math.round((services[0]?.defaultPrice || 0) / 10));

  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [totalSessions, setTotalSessions] = useState<number>(8);
  const [injectionSites, setInjectionSites] = useState<string[]>([]);
  const [surgeryType, setSurgeryType] = useState('بلفاروپلاستی پلک بالا');
  const [mesoType, setMesoType] = useState('مزوتراپی موی سر');
  const [serviceNotes, setServiceNotes] = useState('');

  // Dynamic unit label helper based on service name & category
  const getServiceUnitTitle = useMemo(() => {
    if (isCustomServiceMode) return 'تعداد خدمت';
    if (!selectedService) return 'تعداد';
    const n = selectedService.name.toLowerCase();
    const c = selectedService.category;
    if (c === 'mole' || n.includes('خال')) return 'تعداد خال (عدد)';
    if (c === 'filler' || n.includes('فیلر') || n.includes('ژل')) return 'میزان ژل / فیلر (سی‌سی)';
    if (c === 'botox' || n.includes('بوتاکس')) return 'ناحیه / واحد تزریق';
    if (c === 'mesotherapy' || c === 'prp' || n.includes('مزو') || n.includes('پی آر پی')) return 'تعداد جلسه / ویال';
    if (c === 'piercing' || n.includes('پیرسینگ')) return 'تعداد پیرسینگ (عدد)';
    if (c === 'laser' || c === 'laser_women' || c === 'laser_men' || n.includes('لیزر')) return 'تعداد جلسه / ناحیه';
    return 'تعداد / واحد';
  }, [selectedService, isCustomServiceMode]);

  // Handler to change quantity with automatic price synchronization
  const handleQuantityChange = (newQty: number) => {
    const val = Math.max(0.01, newQty);
    setQuantity(val);
    setQuantityInput(String(val));
    setDraftAlreadyAdded(false);
    if (pricingCustomType === 'fixed_total' && isCustomPriceActive) {
      // In fixed total mode (e.g. 1,000,000 Toman for all 10 moles)
      const unit = val > 0 ? Math.round(totalPriceToman / val) : totalPriceToman;
      setUnitPriceToman(unit);
      setBasePrice(unit * 10);
    } else {
      // In per unit mode, total = unit * val
      const tot = unitPriceToman * val;
      setTotalPriceToman(tot);
      setBasePrice(unitPriceToman * 10);
    }
  };

  // Handler to set custom unit price in Toman
  const handleSetUnitPriceToman = (toman: number) => {
    const val = Math.max(0, toman);
    setDraftAlreadyAdded(false);
    setUnitPriceToman(val);
    const tot = val * quantity;
    setTotalPriceToman(tot);
    setBasePrice(val * 10);
    setIsCustomPriceActive(true);
  };

  // Handler to set fixed total price in Toman (e.g. user enters 1,000,000 Toman for 10 moles)
  const handleSetTotalPriceToman = (toman: number) => {
    const val = Math.max(0, toman);
    setDraftAlreadyAdded(false);
    setTotalPriceToman(val);
    const unit = quantity > 0 ? Math.round(val / quantity) : val;
    setUnitPriceToman(unit);
    setBasePrice(unit * 10);
    setIsCustomPriceActive(true);
  };

  // Reset to default catalog price
  const handleResetToCatalogPrice = () => {
    setDraftAlreadyAdded(false);
    setIsCustomPriceActive(false);
    if (selectedService) {
      const defaultToman = Math.round(selectedService.defaultPrice / 10);
      setUnitPriceToman(defaultToman);
      setTotalPriceToman(defaultToman * quantity);
      setBasePrice(selectedService.defaultPrice);
    }
  };

  // Step 3: Operator & Consumables
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(operators[0]?.id || '');
  const [selectedConsumables, setSelectedConsumables] = useState<Record<string, boolean>>({
    'عینک محافظ': true,
    'حوله یکبار مصرف': true,
  });

  // Step 4: Financial & Payment
  const [basePrice, setBasePrice] = useState<number>(services[0]?.defaultPrice || 0);
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(['pos']);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const togglePaymentMethod = (methodId: PaymentMethod) => {
    setPaymentMethods((prev) => {
      if (prev.includes(methodId)) {
        if (prev.length === 1) return prev; // At least one payment method must stay selected
        return prev.filter((m) => m !== methodId);
      } else {
        return [...prev, methodId];
      }
    });
  };

  // Cheque Fields
  const [chequeIssuer, setChequeIssuer] = useState('');
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [chequeDueDate, setChequeDueDate] = useState<string>(addDaysToPersianDate(today, 30));
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBankName, setChequeBankName] = useState('بانک ملت');
  const [chequeNotes, setChequeNotes] = useState('');

  // Follow-up appointment
  const [followUpDate, setFollowUpDate] = useState<string>(
    addDaysToPersianDate(today, services[0]?.followUpDaysDefault || 30)
  );
  const [followUpTime, setFollowUpTime] = useState<string>('10:00');
  const [followUpReason, setFollowUpReason] = useState<string>(services[0]?.followUpNoteDefault || '');
  const [enableFollowUp, setEnableFollowUp] = useState(true);

  // Preselected patient trigger
  useEffect(() => {
    if (preselectedPatientId) {
      const found = patients.find((p) => p.id === preselectedPatientId);
      if (found) {
        setSelectedPatient(found);
      }
    }
  }, [preselectedPatientId, patients]);

  // Auto-switch laser department to match patient gender
  useEffect(() => {
    if (selectedPatient?.gender === 'male' && selectedDepartment === 'laser_women') {
      handleSelectDepartment('laser_men');
    } else if (selectedPatient?.gender === 'female' && selectedDepartment === 'laser_men') {
      handleSelectDepartment('laser_women');
    }
  }, [selectedPatient?.id, selectedPatient?.gender, selectedDepartment]);

  // When service changes, update price and intelligent follow-up suggestions
  useEffect(() => {
    if (selectedService && !isCustomServiceMode) {
      if (!isCustomPriceActive) {
        const defaultToman = Math.round(selectedService.defaultPrice / 10);
        setUnitPriceToman(defaultToman);
        setTotalPriceToman(defaultToman * quantity);
        setBasePrice(selectedService.defaultPrice);
      }
      const days = selectedService.followUpDaysDefault || 30;
      setFollowUpDate(addDaysToPersianDate(today, days));
      setFollowUpReason(selectedService.followUpNoteDefault || `مراجعه بعدی جهت ${selectedService.name}`);
      if (selectedService.defaultSessions) {
        setTotalSessions(selectedService.defaultSessions);
      }
    }
  }, [selectedService, today, isCustomPriceActive, isCustomServiceMode, quantity]);

  // Consumables sum
  const consumablesCost = useMemo(() => {
    return consumablesList.reduce((sum, item) => {
      if (selectedConsumables[item.name]) {
        return sum + item.cost;
      }
      return sum;
    }, 0);
  }, [consumablesList, selectedConsumables]);

  // Calculations
  const cartServicesTotal = useMemo(
    () => selectedServicesCart.reduce((sum, item) => sum + item.totalAmount, 0),
    [selectedServicesCart]
  );

  const rawTotal = useMemo(() => {
    const currentServiceTotal = draftAlreadyAdded ? 0 : basePrice * quantity;
    return cartServicesTotal + currentServiceTotal + consumablesCost;
  }, [cartServicesTotal, draftAlreadyAdded, basePrice, quantity, consumablesCost]);

  const finalPayable = useMemo(() => {
    return Math.max(0, rawTotal - discount);
  }, [rawTotal, discount]);

  // Synchronize paid amount when final amount changes if user hasn't typed a custom partial amount
  useEffect(() => {
    setPaidAmount(finalPayable);
    if (paymentMethods.includes('cheque')) {
      setChequeAmount(finalPayable);
    }
  }, [finalPayable, paymentMethods]);

  const debtAmount = useMemo(() => {
    return Math.max(0, finalPayable - paidAmount);
  }, [finalPayable, paidAmount]);

  // Filtered search list for existing patients
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return patients.filter((p) => {
      return (
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.nationalId.includes(q) ||
        p.phone.includes(q)
      );
    });
  }, [patients, searchQuery]);


  const addCurrentServiceToCart = () => {
    if (!selectedService && !isCustomServiceMode) return;
    const serviceName = isCustomServiceMode ? (customServiceName.trim() || 'خدمت آزاد و دلخواه') : (customServiceName.trim() || selectedService?.name || 'خدمت');
    const serviceCategory = isCustomServiceMode
      ? (customServiceDept === 'laser_women' ? 'laser_women' : customServiceDept === 'laser_men' ? 'laser_men' : 'custom')
      : (selectedService?.category || 'custom');
    const serviceId = isCustomServiceMode ? `srv-custom-${Date.now()}` : (selectedService?.id || `srv-${Date.now()}`);
    const item: AdmissionServiceItem = {
      serviceId,
      serviceName,
      serviceCategory,
      quantity,
      quantityLabel: quantityInput,
      unitPrice: basePrice,
      totalAmount: Math.round(basePrice * quantity),
      details: {
        laserAreas: !isCustomServiceMode && ['laser', 'laser_women', 'laser_men'].includes(selectedService?.category || 'custom') ? [selectedService?.name || ''] : undefined,
        sessionNumber: !isCustomServiceMode ? sessionNumber : undefined,
        totalSessions: !isCustomServiceMode ? (totalSessions || undefined) : undefined,
        injectionSites: !isCustomServiceMode && ['botox', 'filler', 'prp'].includes(selectedService?.category || 'custom') ? injectionSites : undefined,
        surgeryType: !isCustomServiceMode && selectedService?.category === 'surgery' ? surgeryType : undefined,
        mesoType: !isCustomServiceMode && selectedService?.category === 'mesotherapy' ? mesoType : undefined,
        customServiceName: customServiceName || undefined,
        notes: serviceNotes || undefined,
      },
    };
    setSelectedServicesCart((current) => [...current, item]);
    setDraftAlreadyAdded(true);
  };

  // Toggle injection site
  const toggleInjectionSite = (site: string) => {
    if (injectionSites.includes(site)) {
      setInjectionSites(injectionSites.filter((s) => s !== site));
    } else {
      setInjectionSites([...injectionSites, site]);
    }
  };

  // Submit Admission
  const handleSubmitAdmission = (registrationStatus: 'temporary' | 'final' = 'final') => {
    if (!selectedPatient) {
      alert('لطفاً ابتدا بیمار را از لیست انتخاب یا جستجو فرمایید.');
      return;
    }

    const operator = operators.find((op) => op.id === selectedOperatorId) || operators[0];

    // Build consumables list
    const usedConsumables = consumablesList
      .filter((c) => selectedConsumables[c.name])
      .map((c) => ({ name: c.name, cost: c.cost }));

    // Cheque payload
    let chequePayload: ChequeDetails | undefined = undefined;
    if (paymentMethods.includes('cheque')) {
      chequePayload = {
        issuer: chequeIssuer || `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        amount: chequeAmount || finalPayable,
        dueDate: chequeDueDate,
        chequeNumber: chequeNumber || '---',
        bankName: chequeBankName,
        status: 'pending',
        notes: chequeNotes,
      };
    }

    const currentServiceItem: AdmissionServiceItem = {
      serviceId: isCustomServiceMode ? `srv-custom-${Date.now()}` : (selectedService?.id || `srv-${Date.now()}`),
      serviceName: isCustomServiceMode ? (customServiceName.trim() || 'خدمت آزاد و دلخواه') : (selectedService?.name || 'خدمت'),
      serviceCategory: isCustomServiceMode
        ? (customServiceDept === 'laser_women' ? 'laser_women' : customServiceDept === 'laser_men' ? 'laser_men' : 'custom')
        : (selectedService?.category || 'custom'),
      quantity,
      quantityLabel: quantityInput,
      unitPrice: basePrice,
      totalAmount: Math.round(basePrice * quantity),
      details: {
        laserAreas: !isCustomServiceMode && ['laser', 'laser_women', 'laser_men'].includes(selectedService.category) ? [selectedService.name] : undefined,
        sessionNumber: !isCustomServiceMode ? sessionNumber : undefined,
        totalSessions: !isCustomServiceMode ? (totalSessions || undefined) : undefined,
        injectionSites: !isCustomServiceMode && ['botox', 'filler', 'prp'].includes(selectedService.category) ? injectionSites : undefined,
        surgeryType: !isCustomServiceMode && selectedService.category === 'surgery' ? surgeryType : undefined,
        mesoType: !isCustomServiceMode && selectedService.category === 'mesotherapy' ? mesoType : undefined,
        customServiceName: customServiceName || undefined,
        notes: serviceNotes || undefined,
      },
    };
    const admissionServices = draftAlreadyAdded ? selectedServicesCart : [...selectedServicesCart, currentServiceItem];
    if (!admissionServices.length) {
      alert('لطفاً حداقل یک خدمت انتخاب کنید.');
      return;
    }
    const firstService = admissionServices[0];
    const combinedServiceNames = admissionServices.map((item) => item.serviceName).join('، ');

    const newAdmission: Admission = {
      id: `adm-${Date.now()}`,
      admissionNumber: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: selectedPatient.id,
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      patientPhone: selectedPatient.phone,
      patientNationalId: selectedPatient.nationalId,
      serviceId: firstService.serviceId,
      serviceName: combinedServiceNames,
      serviceCategory: firstService.serviceCategory,
      serviceItems: admissionServices,
      operatorId: operator.id,
      operatorName: operator.name,
      date: today,
      timestamp: Date.now(),
      details: firstService.details || { notes: serviceNotes || undefined },
      consumables: usedConsumables,
      basePrice: firstService.unitPrice,
      quantity: firstService.quantity,
      discount,
      finalAmount: finalPayable,
      paidAmount,
      debtAmount,
      paymentMethod: paymentMethods[0] || 'pos',
      paymentMethods,
      paymentNotes: paymentMethods.length >= 2 ? paymentNotes.trim() : undefined,
      chequeDetails: chequePayload,
      followUpDate: enableFollowUp ? followUpDate : undefined,
      followUpReason: enableFollowUp ? followUpReason : undefined,
      status: 'completed',
      registrationStatus,
    };

    let reminderPayload: FollowUpReminder | undefined = undefined;
    if (enableFollowUp && followUpDate) {
      reminderPayload = {
        id: `flw-${Date.now()}`,
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientPhone: selectedPatient.phone,
        admissionId: newAdmission.id,
        serviceName: newAdmission.serviceName,
        operatorName: operator.name,
        previousVisitDate: today,
        scheduledDate: followUpDate,
        status: 'pending',
        reason: followUpReason || `پیگیری نوبت ${newAdmission.serviceName}`,
      };
    }

    onAdmissionCreated(newAdmission, reminderPayload);

    if (registrationStatus === 'final' && enableFollowUp && followUpDate && followUpTime && selectedPatient.phone?.trim()) {
      fetch(getApiUrl('/api/sms/appointment'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedPatient.phone,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          date: followUpDate,
          time: followUpTime,
        }),
      })
        .then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.success) {
            alert(result.message || 'پذیرش ثبت شد، اما ارسال پیامک نوبت بعدی ناموفق بود.');
          }
        })
        .catch(() => alert('پذیرش ثبت شد، اما ارتباط با سرویس پیامک برقرار نشد.'));
    }

    setSelectedServicesCart([]);
    setDraftAlreadyAdded(false);
    setPaymentMethods(['pos']);
    setPaymentNotes('');
  };

  if (!selectedService) {
    return (
      <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-right" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-bold text-amber-950">خدماتی برای پذیرش ثبت نشده است</h2>
            <p className="text-sm leading-7 text-amber-900">
              فهرست خدمات خالی است یا هنوز بارگذاری نشده. برای ادامه، بخش مدیریت مطب را باز کنید و خدمات را بررسی کنید؛ سپس دوباره وارد پذیرش شوید.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Prompt & Patient Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
              ۱
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">شناسایی و انتخاب بیمار</h3>
              <p className="text-xs text-slate-500">
                کد ملی، شماره همراه یا نام بیمار را جستجو و جهت پذیرش انتخاب نمایید
              </p>
            </div>
          </div>

          {selectedPatient && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenPatientDossier(selectedPatient.id)}
                className="text-xs text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                مشاهده پرونده کامل
              </button>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 cursor-pointer"
              >
                تغییر بیمار
              </button>
            </div>
          )}
        </div>

        {/* If Patient is Already Selected: Show Clean Identity Card */}
        {selectedPatient ? (
          <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-sky-200 text-sky-700 font-bold flex items-center justify-center text-sm shadow-2xs">
                {selectedPatient.gender === 'female' ? 'خانم' : 'آقا'}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-slate-500 mt-1">
                  <span>کد ملی: <span className="font-mono tabular-nums text-slate-700">{selectedPatient.nationalId || 'ثبت نشده'}</span></span>
                  <span aria-hidden="true">·</span>
                  <span>تلفن: <span className="font-mono tabular-nums text-slate-700">{selectedPatient.phone}</span></span>
                  <span aria-hidden="true">·</span>
                  <span>سن: <span className="font-mono tabular-nums">{selectedPatient.age} سال</span></span>
                  {selectedPatient.job && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>شغل: <span className="text-slate-700">{selectedPatient.job}</span></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedPatient.medicalHistory && selectedPatient.medicalHistory !== 'ندارد' && (
              <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200/60 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>هشدار پزشکی: {selectedPatient.medicalHistory}</span>
              </div>
            )}
          </div>
        ) : (
          /* Search Existing Patient Bar */
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو با کد ملی (۱۰ رقم)، شماره تماس (۰۹...) یا نام و نام خانوادگی بیمار..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Live Search Results */}
            {searchQuery.trim() ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 bg-slate-50/70">
                    <UserX className="w-7 h-7 text-slate-300" />
                    <p className="font-semibold text-slate-700">بیماری با مشخصات وارد شده یافت نشد.</p>
                    <p className="text-slate-500 max-w-sm text-[11px] leading-relaxed">
                      ثبت بیمار جدید فقط در بخش <strong>«پرونده بیماران»</strong> انجام می‌شود. پس از ثبت پرونده، بیمار در این قسمت قابل جستجو و انتخاب خواهد بود.
                    </p>
                  </div>
                ) : (
                  searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatient(p)}
                      className="p-3 hover:bg-sky-50/60 cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{p.firstName} {p.lastName}</span>
                        <span className="text-slate-400 mr-2">({p.gender === 'female' ? 'خانم' : 'آقا'}، {p.age} سال)</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          کد ملی: <span className="font-mono tabular-nums">{p.nationalId || 'ثبت نشده'}</span> | تلفن: <span className="font-mono tabular-nums">{p.phone}</span>
                          {p.job && <span className="mr-2 text-slate-400">| شغل: {p.job}</span>}
                        </div>
                      </div>
                      <span className="text-sky-600 font-medium bg-sky-50 hover:bg-sky-100 px-3 py-1 rounded-lg transition-colors">
                        انتخاب جهت پذیرش
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>یا یکی از بیماران زیر را جهت پذیرش انتخاب فرمایید:</span>
                  <span className="text-slate-400 font-mono tabular-nums">مجموع پرونده‌ها: {patients.length} نفر</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/30">
                  {patients.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      هنوز هیچ بیماری در سامانه ثبت نشده است. لطفاً ابتدا در بخش «پرونده بیماران» اقدام به ثبت پرونده فرمایید.
                    </div>
                  ) : (
                    patients.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="p-3 hover:bg-sky-50/60 cursor-pointer transition-colors flex items-center justify-between text-xs group"
                      >
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-sky-700">{p.firstName} {p.lastName}</span>
                          <span className="text-slate-400 mr-2">({p.gender === 'female' ? 'خانم' : 'آقا'}{p.age ? `، ${p.age} سال` : ''})</span>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            کد ملی: <span className="font-mono tabular-nums">{p.nationalId || 'ثبت نشده'}</span> | تلفن: <span className="font-mono tabular-nums">{p.phone}</span>
                            {p.job && <span className="mr-2 text-slate-400">| شغل: {p.job}</span>}
                          </div>
                        </div>
                        <span className="text-sky-600 font-medium bg-white group-hover:bg-sky-600 group-hover:text-white border border-sky-200 group-hover:border-transparent px-3 py-1 rounded-lg transition-colors">
                          انتخاب جهت پذیرش
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Service Selection & Specific Parameters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
            ۲
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">انتخاب خدمت پزشکی / زیبایی</h3>
            <p className="text-xs text-slate-500">
              خدمت مورد نظر را انتخاب و پارامترهای مربوط به جلسات و نواحی را مشخص نمایید
            </p>
          </div>
        </div>

        {/* 3 Main Clinic Services Selector (۱. خدمات زیبایی  ۲. خدمات لیزر بانوان  ۳. خدمات لیزر آقایان) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              دسته‌بندی خدمات کلینیک (یکی از ۳ خدمت اصلی را انتخاب کنید):
            </span>
            <span className="text-[11px] text-slate-500">
              با انتخاب هر خدمت، سرویس‌های مربوط به آن فراخوانی می‌شود
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* ۱. خدمات زیبایی */}
            <button
              type="button"
              onClick={() => handleSelectDepartment('beauty')}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedDepartment === 'beauty'
                  ? 'border-purple-600 bg-purple-50/60 shadow-xs ring-1 ring-purple-600'
                  : 'border-slate-200/90 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      selectedDepartment === 'beauty'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    ۱
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    خدمات زیبایی
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedDepartment === 'beauty'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {beautyCount} خدمت
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pr-8">
                بوتاکس، فیلر، هایفوتراپی، مزوتراپی، PRP، جراحی سرپایی و ویزیت
              </p>
            </button>

            {/* ۲. خدمات لیزر بانوان */}
            <button
              type="button"
              onClick={() => handleSelectDepartment('laser_women')}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedDepartment === 'laser_women'
                  ? 'border-rose-500 bg-rose-50/60 shadow-xs ring-1 ring-rose-500'
                  : 'border-slate-200/90 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      selectedDepartment === 'laser_women'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    ۲
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    خدمات لیزر بانوان
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedDepartment === 'laser_women'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {laserWomenCount} خدمت
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pr-8">
                پکیج‌های توتال بادی VIP، فول بادی، کاربردی و کلیه نواحی بانوان
              </p>
            </button>

            {/* ۳. خدمات لیزر آقایان */}
            <button
              type="button"
              onClick={() => handleSelectDepartment('laser_men')}
              className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedDepartment === 'laser_men'
                  ? 'border-sky-600 bg-sky-50/60 shadow-xs ring-1 ring-sky-600'
                  : 'border-slate-200/90 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      selectedDepartment === 'laser_men'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    ۳
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    خدمات لیزر آقایان
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedDepartment === 'laser_men'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {laserMenCount} خدمت
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pr-8">
                پکیج‌های توتال، فول بادی، آنکارد ریش، بالاتنه و کلیه نواحی آقایان
              </p>
            </button>
          </div>
        </div>

        {/* Sub-Filters & Quick Search for Active Department */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Quick Search inside active department */}
            <div className="relative flex-1">
              <input
                type="text"
                value={serviceSearchQuery}
                onChange={(e) => setServiceSearchQuery(e.target.value)}
                placeholder={
                  selectedDepartment === 'beauty'
                    ? 'جستجو در خدمات زیبایی (مثال: بوتاکس، فیلر، هایفو، بلفاروپلاستی، PRP...)'
                    : selectedDepartment === 'laser_women'
                    ? 'جستجو در خدمات لیزر بانوان (مثال: توتال، فول بادی، کاربردی، پا، بیکینی...)'
                    : 'جستجو در خدمات لیزر آقایان (مثال: توتال، آنکارد ریش، سینه، بالاتنه...)'
                }
                className="w-full px-3.5 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
              {serviceSearchQuery && (
                <button
                  type="button"
                  onClick={() => setServiceSearchQuery('')}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Custom unlisted service button */}
            <button
              type="button"
              onClick={() => {
                setIsCustomServiceMode(true);
                setIsCustomPriceActive(true);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 ${
                isCustomServiceMode
                  ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-400'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
              title="ثبت خدمت اختصاصی یا خارج از لیست با قیمت دلخواه دستی"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>+ ثبت خدمت آزاد / خارج از لیست (قیمت دستی)</span>
            </button>
          </div>

          {/* Sub-Category Filter Pills based on active department */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {selectedDepartment === 'beauty' && (
              <>
                {[
                  { id: 'all', label: `همه خدمات زیبایی (${beautyCount})` },
                  { id: 'botox_filler', label: 'بوتاکس، فیلر و مزوژل' },
                  { id: 'hifu', label: 'هایفوتراپی و جوانسازی' },
                  { id: 'meso_prp', label: 'مزوتراپی و PRP' },
                  { id: 'surgery', label: 'جراحی‌های سرپایی و ساکشن' },
                  { id: 'carbon_qswitch', label: 'کیوسوییچ و کربن' },
                  { id: 'skin_other', label: 'خال، پیرسینگ و ویزیت' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServiceSubFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      serviceSubFilter === cat.id
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </>
            )}

            {selectedDepartment === 'laser_women' && (
              <>
                {[
                  { id: 'all', label: `همه پکیج‌ها و نواحی بانوان (${laserWomenCount})` },
                  { id: 'packages', label: 'پکیج‌های جامع (توتال، فول‌بادی، کاربردی، استخری)' },
                  { id: 'single_areas', label: 'نواحی تکی (دست، پا، بیکینی، زیربغل، صورت)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServiceSubFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      serviceSubFilter === cat.id
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </>
            )}

            {selectedDepartment === 'laser_men' && (
              <>
                {[
                  { id: 'all', label: `همه پکیج‌ها و نواحی آقایان (${laserMenCount})` },
                  { id: 'packages', label: 'پکیج‌های جامع (توتال بادی، فول‌بادی، بالاتنه کامل)' },
                  { id: 'single_areas', label: 'نواحی موضعی (آنکارد ریش، سینه، کمر، دست، پا)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setServiceSubFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      serviceSubFilter === cat.id
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Custom Service Configuration Card */}
        {isCustomServiceMode && (
          <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-sky-50/80 rounded-2xl border-2 border-indigo-300 shadow-xs space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs sm:text-sm">
                    مشخصات خدمت جدید / متفرقه (خارج از لیست تعرفه مطب)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    برای خدماتی که در لیست نیستند یا قیمت توافقی و تعداد خاص دارند (مثلاً ۱,۰۰۰,۰۰۰ تومان توافقی)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomServiceMode(false)}
                className="text-xs text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer"
              >
                انتخاب از لیست کاتالوگ مطب ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  عنوان خدمت دلخواه <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="مثال: برداشتن ۱۰ عدد خال صورت و گردن یا پاکسازی ترکیبی"
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  دسته‌بندی درمانی / لاین کلینیک:
                </label>
                <select
                  value={customServiceDept}
                  onChange={(e) => setCustomServiceDept(e.target.value as MainDepartmentId)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-medium text-xs cursor-pointer"
                >
                  <option value="beauty">۱. خدمات زیبایی (تزریقات، پوست، جراحی سرپایی)</option>
                  <option value="laser_women">۲. خدمات لیزر بانوان</option>
                  <option value="laser_men">۳. خدمات لیزر آقایان</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Service Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto p-0.5">
          {/* Custom Service Card in Grid */}
          <button
            type="button"
            onClick={() => {
              setDraftAlreadyAdded(false);
              setIsCustomServiceMode(true);
              setIsCustomPriceActive(true);
            }}
            className={`p-3 rounded-xl border-2 border-dashed text-right transition-all flex flex-col justify-between h-20 cursor-pointer ${
              isCustomServiceMode
                ? 'border-indigo-600 bg-indigo-50/90 shadow-xs ring-1 ring-indigo-500'
                : 'border-indigo-300/80 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/70'
            }`}
          >
            <div className="font-bold text-xs text-indigo-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">خدمت دلخواه / جدید</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-indigo-600 mt-1">
              <span>تعرفه توافقی دستی</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded font-bold">آزاد</span>
            </div>
          </button>

          {filteredServices.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400">
              خدمتی با این مشخصات یافت نشد. می‌توانید از گزینه «خدمت دلخواه / جدید» استفاده کنید.
            </div>
          ) : (
            filteredServices.map((srv) => {
              const isSelected = !isCustomServiceMode && srv.id === selectedServiceId;
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => {
                    setDraftAlreadyAdded(false);
                    setIsCustomServiceMode(false);
                    setSelectedServiceId(srv.id);
                  }}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between h-20 cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/60 shadow-xs ring-1 ring-sky-500'
                      : 'border-slate-200/80 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-900 truncate" title={srv.name}>
                    {srv.name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="font-mono tabular-nums font-medium text-sky-700">{formatToman(srv.defaultPrice)}</span>
                    {srv.defaultSessions && (
                      <span className="text-[10px] text-slate-400">{srv.defaultSessions} جلسه‌ای</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 🎛️ Pricing & Quantity Control Bar (تغییر تعداد و قیمت آزاد) */}
        <div className="p-4 bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-slate-50 rounded-2xl border border-sky-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-sky-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  تنظیم تعداد و مبلغ خدمت: {isCustomServiceMode ? (customServiceName || 'خدمت دلخواه دستی') : `«${selectedService.name}»`}
                </h4>
                <p className="text-[11px] text-slate-500">
                  افزایش تعداد (مثلاً به جای ۱ خال، ۱۰ عدد خال) و ورود قیمت دستی دلخواه (مثلاً ۱,۰۰۰,۰۰۰ تومان مقطوع یا تعرفه هر واحد)
                </p>
              </div>
            </div>

            {/* Reset to system price button */}
            {!isCustomServiceMode && isCustomPriceActive && (
              <button
                type="button"
                onClick={handleResetToCatalogPrice}
                className="text-[11px] text-sky-700 hover:text-sky-800 bg-white border border-sky-200 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shadow-2xs"
              >
                بازنشانی به تعرفه کاتالوگ ({formatTomanActual(selectedService.defaultPrice)})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Quantity Stepper & Chips */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
              <label className="block text-slate-700 font-bold text-xs">
                {getServiceUnitTitle}:
              </label>

              {/* Stepper with +/- */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-base transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  title="کاهش تعداد"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  inputMode="decimal"
                  value={quantityInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setQuantityInput(value);
                    const normalized = value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(',', '.').replace('/', '.');
                    const parsed = Number(normalized);
                    if (Number.isFinite(parsed) && parsed > 0) {
                      setQuantity(parsed);
                      setDraftAlreadyAdded(false);
                    }
                  }}
                  className="w-24 py-1.5 bg-slate-50 border-2 border-sky-400 rounded-xl font-mono text-center font-bold text-sm text-sky-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />

                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center font-bold text-base transition-colors shadow-xs cursor-pointer"
                  title="افزایش تعداد"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <span className="text-xs font-semibold text-slate-600 mr-1">
                  {getServiceUnitTitle.includes('خال') ? 'عدد خال' : getServiceUnitTitle.includes('سی‌سی') ? 'سی‌سی' : 'واحد'}
                </span>
              </div>

              {/* Quick Quantity Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-medium">انتخاب سریع:</span>
                {[1, 2, 3, 4, 5, 8, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleQuantityChange(num)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                      quantity === num
                        ? 'bg-sky-700 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Box 2: Pricing Customizer */}
            <div className="space-y-2 bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-bold text-xs">
                  تعرفه و نحوه قیمت‌گذاری:
                </label>

                {!isCustomServiceMode && (
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={handleResetToCatalogPrice}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        !isCustomPriceActive
                          ? 'bg-white text-slate-900 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      تعرفه مصوب
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomPriceActive(true)}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        isCustomPriceActive
                          ? 'bg-sky-600 text-white font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      قیمت دستی دلخواه
                    </button>
                  </div>
                )}
              </div>

              {isCustomPriceActive || isCustomServiceMode ? (
                <div className="space-y-2 pt-1">
                  {/* Sub-toggle: per unit vs fixed total */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500 text-[10px]">مبنای ورود:</span>
                    <button
                      type="button"
                      onClick={() => setPricingCustomType('per_unit')}
                      className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors cursor-pointer ${
                        pricingCustomType === 'per_unit'
                          ? 'bg-sky-50 border-sky-400 text-sky-800 font-bold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      تعرفه هر واحد ({getServiceUnitTitle.includes('خال') ? 'هر دانه خال' : 'هر واحد'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingCustomType('fixed_total')}
                      className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors cursor-pointer ${
                        pricingCustomType === 'fixed_total'
                          ? 'bg-sky-50 border-sky-400 text-sky-800 font-bold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      مبلغ کل مقطوع ({quantity} مورد باهم)
                    </button>
                  </div>

                  {/* Input in Toman */}
                  <div className="relative">
                    <input
                      type="number"
                      step="10000"
                      value={pricingCustomType === 'fixed_total' ? (totalPriceToman || '') : (unitPriceToman || '')}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (pricingCustomType === 'fixed_total') {
                          handleSetTotalPriceToman(val);
                        } else {
                          handleSetUnitPriceToman(val);
                        }
                      }}
                      placeholder={pricingCustomType === 'fixed_total' ? 'مثال: 1000000 (یک میلیون تومان)' : 'مثال: 100000 (صد هزار تومان)'}
                      className="w-full pl-14 pr-3 py-1.5 bg-slate-50 border border-sky-300 rounded-xl font-mono text-left font-bold text-xs text-sky-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                    />
                    <span className="absolute left-3 top-2 text-[11px] text-slate-500 font-medium">
                      تومان
                    </span>
                  </div>

                  {/* Quick Preset Amount Buttons */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400">مبالغ سریع:</span>
                    {[
                      { val: 100000, label: '۱۰۰ هزار' },
                      { val: 250000, label: '۲۵۰ هزار' },
                      { val: 500000, label: '۵۰۰ هزار' },
                      { val: 1000000, label: '۱ میلیون' },
                      { val: 1500000, label: '۱.۵ م' },
                      { val: 2000000, label: '۲ میلیون' },
                      { val: 3000000, label: '۳ میلیون' },
                      { val: 5000000, label: '۵ میلیون' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => {
                          if (pricingCustomType === 'fixed_total') {
                            handleSetTotalPriceToman(p.val);
                          } else {
                            handleSetUnitPriceToman(p.val);
                          }
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 text-[10px] transition-colors cursor-pointer font-medium"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Words Conversion Indicator */}
                  <div className="text-[11px] text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg font-medium flex items-center justify-between border border-sky-100">
                    <span>به حروف: {numberToPersianWordsToman(totalPriceToman)}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      (معادل {formatToman(totalPriceToman * 10)})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">تعرفه مصوب هر واحد:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatTomanActual(selectedService.defaultPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-700 font-semibold">
                      مبلغ کل ({quantity} {getServiceUnitTitle.includes('خال') ? 'خال' : 'واحد'}):
                    </span>
                    <span className="font-mono font-black text-sky-800 text-xs">
                      {formatTomanActual(selectedService.defaultPrice * quantity)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Calculation Summary Line */}
          <div className="pt-2 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">خلاصه محاسبه:</span>
              <span className="font-mono tabular-nums text-slate-800 font-medium">
                {quantity} × {unitPriceToman.toLocaleString('fa-IR')} تومان ={' '}
                <span className="font-bold text-sky-800 text-sm">
                  {totalPriceToman.toLocaleString('fa-IR')} تومان
                </span>
              </span>
              {(isCustomPriceActive || isCustomServiceMode) && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  تعرفه دستی توافقی
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              معادل ریالی: {formatToman(basePrice * quantity)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><h4 className="text-xs font-bold text-slate-800">خدمات انتخاب‌شده برای این پذیرش</h4><p className="text-[11px] text-slate-500 mt-1">می‌توانید بوتاکس، لیزر و خدمات دیگر را با تعداد و قیمت جداگانه اضافه کنید.</p></div>
            <button type="button" onClick={addCurrentServiceToCart} className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-bold text-white">افزودن خدمت فعلی</button>
          </div>
          {selectedServicesCart.length > 0 ? (
            <div className="space-y-2">
              {selectedServicesCart.map((item, index) => (
                <div key={`${item.serviceId}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-white p-3 text-xs">
                  <div><span className="font-bold text-slate-800">{item.serviceName}</span><span className="mr-2 text-slate-500">تعداد/واحد: {item.quantityLabel}</span></div>
                  <div className="flex items-center gap-3"><span className="font-bold text-indigo-700">{formatToman(item.totalAmount)}</span><button type="button" onClick={() => { setSelectedServicesCart((current) => current.filter((_, i) => i !== index)); setDraftAlreadyAdded(false); }} className="text-rose-600 hover:text-rose-700">حذف</button></div>
                </div>
              ))}
              <div className="text-left text-xs font-bold text-slate-700">جمع خدمات افزوده‌شده: {formatToman(cartServicesTotal)}</div>
            </div>
          ) : <p className="text-[11px] text-slate-500">هنوز خدمتی به فهرست اضافه نشده است؛ خدمت فعلی هنگام ثبت پذیرش نیز ثبت می‌شود.</p>}
        </div>

        {/* Service Specialized Options Drawer / Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-4">
          {/* Laser specific options */}
          {(selectedService.category === 'laser' || selectedService.category === 'laser_women' || selectedService.category === 'laser_men') && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">شماره جلسه کنونی:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={sessionNumber}
                    onChange={(e) => setSessionNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">کل جلسات پکیج دوره درمان:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(parseInt(e.target.value, 10) || 8)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botox specific options */}
          {selectedService.category === 'botox' && (
            <div className="space-y-3">
              <span className="font-bold text-slate-800 block">محل‌های تزریق بوتاکس:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'پیشانی (خطوط افقی)',
                  'خط اخم (گلابلا)',
                  'دور چشم (پنجه کلاغی)',
                  'خطوط پنجه خرگوشی بینی (بانی لاینز)',
                  'زیر بغل (ضد تعریق)',
                  'لیفت گوشه لب و چانه',
                  'میگرن مزمن',
                ].map((site) => (
                  <button
                    key={site}
                    type="button"
                    onClick={() => toggleInjectionSite(site)}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                      injectionSites.includes(site)
                        ? 'bg-sky-600 text-white border-sky-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {site}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filler specific options */}
          {selectedService.category === 'filler' && (
            <div className="space-y-3">
              <span className="font-bold text-slate-800 block">نواحی تزریق فیلر / ژل:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'لب (مدل روسی / طبیعی)',
                  'خط خنده (نازولبیال)',
                  'گونه و مادلینگ',
                  'چانه',
                  'زاویه فک (کانتورینگ)',
                  'زیر چشم (تیرگی و گودی)',
                  'شقیقه',
                ].map((site) => (
                  <button
                    key={site}
                    type="button"
                    onClick={() => toggleInjectionSite(site)}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                      injectionSites.includes(site)
                        ? 'bg-sky-600 text-white border-sky-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {site}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Surgery specific options */}
          {selectedService.category === 'surgery' && (
            <div className="space-y-3">
              <label className="block text-slate-700 font-medium">نوع عمل سرپایی:</label>
              <select
                value={surgeryType}
                onChange={(e) => setSurgeryType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              >
                <option value="بلفاروپلاستی پلک بالا">بلفاروپلاستی پلک بالا</option>
                <option value="بلفاروپلاستی پلک پایین">بلفاروپلاستی پلک پایین</option>
                <option value="ساکشن غبغب">ساکشن غبغب</option>
                <option value="برداشتن توده / لیپوم">برداشتن توده / لیپوم</option>
                <option value="سانترال لب">سانترال لب</option>
                <option value="سایر جراحی‌های سرپایی">سایر جراحی‌های سرپایی</option>
              </select>
            </div>
          )}

          {/* PRP injection points */}
          {selectedService.category === 'prp' && (
            <div className="space-y-3">
              <span className="font-bold text-slate-800 block">ناحیه تزریق PRP:</span>
              <div className="flex flex-wrap gap-1.5">
                {['پوست سر (تقویت مو)', 'صورت (جوانسازی)', 'دست‌ها', 'مفصل / اسکار'].map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleInjectionSite(area)}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                      injectionSites.includes(area)
                        ? 'bg-sky-600 text-white border-sky-600 font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom service title if custom */}
          {selectedService.category === 'custom' && (
            <div>
              <label className="block text-slate-700 font-medium mb-1">عنوان خدمت جدید دستی:</label>
              <input
                type="text"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="مثلاً: هیدرودرمی و پاکسازی عمیق پوست"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
              />
            </div>
          )}

          {/* Multi-session tracker for Tattoo removal, Carbon, Mesotherapy */}
          {(selectedService.category === 'tattoo_face' ||
            selectedService.category === 'tattoo_body' ||
            selectedService.category === 'carbon' ||
            selectedService.category === 'mesotherapy') && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">جلسه چندم:</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">کل جلسات پیش‌بینی شده:</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(parseInt(e.target.value, 10) || 4)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Additional Medical / Treatment Notes & Doctor Visit */}
          <div>
            <label className="block text-slate-600 mb-1 font-medium">توضیحات و ویزیت پزشک:</label>
            <input
              type="text"
              value={serviceNotes}
              onChange={(e) => setServiceNotes(e.target.value)}
              placeholder="مثلاً: نکات ویزیت و تشخیص پزشک، درجه انرژی دستگاه، برند فیلر یا توضیحات تکمیلی..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* 3. Operator Selection & Consumables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operator Selection */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
              ۳
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">انتخاب پزشک / اپراتور</h3>
              <p className="text-xs text-slate-500">شخصی که خدمت را انجام می‌دهد</p>
            </div>
          </div>

          <div className="space-y-2">
            {operators.map((op) => {
              const isSelected = op.id === selectedOperatorId;
              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOperatorId(op.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                      : 'border-slate-200/80 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                        op.role === 'doctor'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {op.role === 'doctor' ? 'دکتر' : 'اپ'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">{op.name}</span>
                      <span className="block text-[11px] text-slate-400">
                        {op.role === 'doctor' ? 'پزشک مطب' : 'تکنسین / اپراتور زیبایی'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    سهم: {op.commissionRate}٪
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consumables Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
              ۴
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">اقلام و مواد مصرفی</h3>
              <p className="text-xs text-slate-500">لوازم بهداشتی و مصرفی این پذیرش</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {consumablesList.map((item, idx) => {
              const isChecked = !!selectedConsumables[item.name];
              return (
                <label
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-slate-200/70 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setSelectedConsumables({
                          ...selectedConsumables,
                          [item.name]: e.target.checked,
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span className="font-medium text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                    {item.cost > 0 ? formatToman(item.cost) : 'رایگان'}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-600">
            <span>مجموع هزینه اقلام مصرفی:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {formatToman(consumablesCost)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Pricing, Calculation & Payment Mode */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
            ۵
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">محاسبه مالی و ثبت پرداخت</h3>
            <p className="text-xs text-slate-500">
              مبالغ، تخفیف، شیوه تسویه حساب و ثبت چک صیادی
            </p>
          </div>
        </div>

        {/* Numeric Pricing Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-bold">تعرفه هر واحد خدمت:</label>
              <span className="text-[10px] text-slate-400 font-mono">
                {unitPriceToman.toLocaleString('fa-IR')} تومان
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="10000"
                value={unitPriceToman || ''}
                onChange={(e) => handleSetUnitPriceToman(parseFloat(e.target.value) || 0)}
                className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums font-bold text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2 text-[11px] text-slate-500 font-medium">
                تومان
              </span>
            </div>
            <span className="block text-[10px] text-slate-400 mt-1 font-mono">
              معادل: {formatToman(basePrice)}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-bold">{getServiceUnitTitle}:</label>
              <span className="text-[10px] text-sky-700 font-bold font-mono">
                {quantity} واحد
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="1"
                max="200"
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                className="flex-1 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums text-center font-bold text-sm text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 5, 10].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQuantityChange(q)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    quantity === q ? 'bg-sky-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-bold">تخفیف پذیرش (تومان):</label>
              <span className="text-[10px] text-rose-600 font-mono">
                {Math.round(discount / 10).toLocaleString('fa-IR')} تومان
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="10000"
                value={discount > 0 ? Math.round(discount / 10) : ''}
                onChange={(e) => setDiscount((parseFloat(e.target.value) || 0) * 10)}
                placeholder="۰"
                className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums text-rose-600 font-bold focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
              <span className="absolute left-3 top-2 text-[11px] text-slate-500 font-medium">
                تومان
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[50000, 100000, 200000, 500000].map((disc) => (
                <button
                  key={disc}
                  type="button"
                  onClick={() => setDiscount(disc * 10)}
                  className="px-1 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  {disc / 1000} هـ
                </button>
              ))}
              {discount > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscount(0)}
                  className="px-1 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Calculation Summary Bar */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-slate-400 block text-[11px]">مبلغ کل خدمات ({quantity} واحد):</span>
              <span className="font-mono tabular-nums font-bold text-slate-800 text-sm">
                {formatTomanActual(rawTotal)}
              </span>
              <span className="block text-[10px] text-slate-400 font-mono">
                ({formatToman(rawTotal)})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">تخفیف:</span>
              <span className="font-mono tabular-nums text-rose-600 font-bold text-sm">
                {discount > 0 ? `- ${formatTomanActual(discount)}` : '۰'}
              </span>
            </div>
            <div className="border-r border-slate-200 pr-6">
              <span className="text-slate-700 block text-xs font-bold">مبلغ نهایی قابل پرداخت:</span>
              <span className="font-mono tabular-nums text-lg font-black text-sky-900">
                {formatTomanActual(finalPayable)}
              </span>
              <span className="block text-[11px] text-sky-700 font-medium">
                به حروف: {numberToPersianWordsToman(Math.round(finalPayable / 10))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[11px] text-slate-600 mb-1 font-bold">مبلغ پرداختی اکنون (تومان):</label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  value={paidAmount > 0 ? Math.round(paidAmount / 10) : (paidAmount === 0 ? 0 : '')}
                  onChange={(e) => setPaidAmount((parseFloat(e.target.value) || 0) * 10)}
                  className="w-36 pl-12 pr-3 py-1.5 bg-white border-2 border-emerald-400 rounded-xl font-mono tabular-nums text-emerald-800 font-bold text-sm focus:outline-hidden"
                />
                <span className="absolute left-2.5 top-1.5 text-[10px] text-emerald-600 font-medium">
                  تومان
                </span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">مانده بدهی بیمار:</span>
              <span
                className={`font-mono tabular-nums font-bold text-sm ${
                  debtAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {debtAmount > 0 ? formatTomanActual(debtAmount) : 'تسویه کامل ✓'}
              </span>
              {debtAmount > 0 && (
                <span className="block text-[10px] text-slate-400 font-mono">
                  ({formatToman(debtAmount)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-800">روش پرداخت:</label>
            {paymentMethods.length > 1 && (
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                پرداخت ترکیبی ({paymentMethods.length} روش انتخاب شده)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { id: 'pos' as PaymentMethod, label: 'کارتخوان (POS)' },
              { id: 'card_to_card' as PaymentMethod, label: 'کارت به کارت' },
              { id: 'cash' as PaymentMethod, label: 'وجه نقد' },
              { id: 'cheque' as PaymentMethod, label: 'چک صیادی' },
            ].map((method) => {
              const isSelected = paymentMethods.includes(method.id);
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => togglePaymentMethod(method.id)}
                  className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                  <span>{method.label}</span>
                </button>
              );
            })}
          </div>

          {/* Conditional Payment Notes: Appears ONLY when 2 or more methods are selected */}
          {paymentMethods.length >= 2 && (
            <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 font-bold text-sky-900">
                <FileText className="w-4 h-4 text-sky-600" />
                <label htmlFor="paymentNotesInput">
                  توضیحات نحوه پرداخت (ثبت در پرونده بیمار):
                </label>
              </div>
              <textarea
                id="paymentNotesInput"
                rows={2}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="توضیحات نحوه پرداخت را اینجا وارد کنید (مثال: ۵۰۰,۰۰۰ تومان نقد و مابقی پوز / شماره پیگیری کارت‌به‌کارت...)"
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-xs leading-relaxed"
              />
              <p className="text-[11px] text-sky-700">
                * این توضیحات به عنوان سند مالی در پرونده بیمار و فیش پذیرش ثبت خواهد شد.
              </p>
            </div>
          )}

          {/* Conditional Cheque Details Form */}
          {paymentMethods.includes('cheque') && (
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-3 animate-in fade-in duration-150">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                <span>مشخصات چک صیادی دریافتی:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">نام صادرکننده چک:</label>
                  <input
                    type="text"
                    value={chequeIssuer}
                    onChange={(e) => setChequeIssuer(e.target.value)}
                    placeholder="مثال: مهرداد جعفری"
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">مبلغ چک (ریال):</label>
                  <input
                    type="number"
                    value={chequeAmount}
                    onChange={(e) => setChequeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div>
                  <PersianDatePicker
                    value={chequeDueDate}
                    onChange={setChequeDueDate}
                    label="تاریخ سررسید چک (شمسی):"
                    placeholder="انتخاب تاریخ چک..."
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">شماره صیادی / چک:</label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="۱۶ رقم صیادی"
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">نام بانک و شعبه:</label>
                  <input
                    type="text"
                    value={chequeBankName}
                    onChange={(e) => setChequeBankName(e.target.value)}
                    placeholder="بانک ملت شعبه ونک"
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">توضیحات و امضا:</label>
                  <input
                    type="text"
                    value={chequeNotes}
                    onChange={(e) => setChequeNotes(e.target.value)}
                    placeholder="ثبت شده در سامانه صیاد"
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Follow-up Intelligent Recommendation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
              ۶
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">پیشنهاد هوشمند زمان مراجعه بعدی</h3>
              <p className="text-xs text-slate-500">
                بر اساس پروتکل درمانی خدمت {selectedService.name}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={enableFollowUp}
              onChange={(e) => setEnableFollowUp(e.target.checked)}
              className="rounded text-sky-600 w-4 h-4"
            />
            <span className="text-slate-700 font-medium">ثبت در تقویم پیگیری</span>
          </label>
        </div>

        {enableFollowUp && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs items-start">
            <div>
              <PersianDatePicker
                value={followUpDate}
                onChange={setFollowUpDate}
                label="تاریخ مراجعه بعدی (شمسی):"
                placeholder="انتخاب تاریخ مراجعه..."
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">ساعت مراجعه بعدی:</label>
              <input
                type="time"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1 font-medium">علت و عنوان نوبت بعدی:</label>
              <input
                type="text"
                value={followUpReason}
                onChange={(e) => setFollowUpReason(e.target.value)}
                placeholder="مثلاً: جلسه دوم لیزر یا کشیدن بخیه"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Final Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="text-xs text-slate-500">
            {selectedPatient ? (
              <span>
                پذیرش برای بیمار: <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
              </span>
            ) : (
              <span className="text-rose-500 font-medium">هنوز بیماری انتخاب نشده است</span>
            )}
          </div>
          <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5">
            مبلغ نهایی: {formatToman(finalPayable)} {debtAmount > 0 && `(مانده بدهی: ${formatToman(debtAmount)})`}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => handleSubmitAdmission('temporary')} disabled={!selectedPatient} className="px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white disabled:bg-slate-200 disabled:text-slate-400"><Clock className="w-4 h-4" /><span>ثبت موقت</span></button>
          <button type="button" onClick={() => handleSubmitAdmission('final')} disabled={!selectedPatient} className="px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400"><CheckCircle2 className="w-4 h-4" /><span>ثبت قطعی</span></button>
        </div>
      </div>
    </div>
  );
};
