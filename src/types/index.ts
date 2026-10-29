export type Gender = 'female' | 'male';

export interface Patient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  phone: string;
  age: number;
  gender: Gender;
  address: string;
  job?: string;           // شغل / حرفه بیمار
  medicalHistory: string; // سابقه بیماری خاص
  allergies: string;      // حساسیت‌ها
  notes?: string;
  createdAt: string;
}

export type ServiceCategory =
  | 'laser_women'
  | 'laser_men'
  | 'laser'
  | 'tattoo_face'
  | 'tattoo_body'
  | 'carbon'
  | 'hifu'
  | 'prp'
  | 'visit'
  | 'mole'
  | 'surgery'
  | 'filler'
  | 'piercing'
  | 'botox'
  | 'mesogel'
  | 'mesotherapy'
  | 'plasma'
  | 'white_hair'
  | 'custom';

export type MainDepartmentId = 'beauty' | 'laser_women' | 'laser_men';

export function getServiceMainDepartment(category: ServiceCategory): MainDepartmentId {
  if (category === 'laser_women') return 'laser_women';
  if (category === 'laser_men') return 'laser_men';
  return 'beauty';
}

export interface ServiceDefinition {
  id: string;
  category: ServiceCategory;
  name: string;
  defaultPrice: number;
  followUpDaysDefault: number; // پیشنهاد مراجعه بعدی به روز (مثلا هایفو ۱۸۰ روز = ۶ ماه)
  followUpNoteDefault: string;
  defaultSessions?: number;
  active: boolean;
}

export interface Operator {
  id: string;
  name: string;
  role: 'doctor' | 'operator' | 'technician';
  commissionRate: number; // درصد سهم، مثلا ۲۰ یا ۴۰
  phone?: string;
  active: boolean;
}

export type PaymentMethod = 'pos' | 'card_to_card' | 'cash' | 'cheque';

export interface ChequeDetails {
  issuer: string;       // نام صادرکننده
  amount: number;       // مبلغ چک
  dueDate: string;      // تاریخ سررسید
  chequeNumber: string; // شماره چک / صیادی
  bankName: string;     // نام بانک و شعبه
  status: 'pending' | 'cleared' | 'bounced'; // در انتظار وصول، وصول شده، برگشتی
  notes?: string;
}

export interface AdmissionConsumable {
  name: string;
  cost: number;
}

export interface AdmissionServiceItem {
  serviceId: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  quantity: number;
  quantityLabel: string;
  unitPrice: number;
  totalAmount: number;
  details?: Admission['details'];
}

export interface Admission {
  id: string;
  admissionNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientNationalId: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  serviceItems?: AdmissionServiceItem[];
  registrationStatus?: 'temporary' | 'final';
  operatorId: string;
  operatorName: string;
  date: string;       // تاریخ شمسی مثلاً ۱۴۰۳/۰۷/۱۶
  timestamp: number;  // epoch ms
  details: {
    laserAreas?: string[];
    sessionNumber?: number;
    totalSessions?: number;
    injectionSites?: string[];
    surgeryType?: string;
    mesoType?: string;
    customServiceName?: string;
    notes?: string;
  };
  consumables: AdmissionConsumable[];
  basePrice: number;
  quantity: number;
  discount: number;
  finalAmount: number;     // مبلغ نهایی (قابل پرداخت)
  paidAmount: number;      // مبلغ پرداخت شده
  debtAmount: number;      // بدهی باقیمانده
  paymentMethod: PaymentMethod;
  paymentMethods?: PaymentMethod[]; // روش‌های پرداخت انتخابی (تکی یا چندگانه)
  /** Actual collected amounts by payment method, in the app's existing rial unit. */
  paymentBreakdown?: Partial<Record<PaymentMethod, number>>;
  paymentNotes?: string;           // توضیحات نحوه پرداخت (وقتی دو مورد یا بیشتر انتخاب شد)
  chequeDetails?: ChequeDetails;
  followUpDate?: string;   // تاریخ مراجعه بعدی پیشنهادی/تاییدشده
  followUpReason?: string;
  /** Optional surgery deposit and scheduled procedure tracking. Amounts are in the app's existing rial unit. */
  deposit?: {
    amount: number;
    paymentMethod: PaymentMethod;
    scheduledDate: string;
    scheduledTime: string;
    status: 'reserved' | 'completed';
    balancePaidAmount?: number;
    balancePaymentMethod?: PaymentMethod;
    completedAt?: number;
    notes?: string;
  };
  voidedAt?: number;
  voidReason?: string;
  status: 'completed' | 'cancelled';
}

export type FollowUpStatus =
  | 'pending'    // در انتظار مراجعه
  | 'attended'   // مراجعه شد
  | 'cancelled'  // لغو شد
  | 'no_answer'  // عدم پاسخ
  | 'overdue';   // عقب‌افتاده

export interface FollowUpReminder {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  admissionId?: string;
  serviceName: string;
  operatorName: string;
  previousVisitDate: string;
  scheduledDate: string;   // YYYY/MM/DD شمسی
  status: FollowUpStatus;
  reason: string;
  notes?: string;
}

export interface Shareholder {
  id: string;
  name: string;
  sharePercentage: number; // درصد سهم از سود کل
}

export interface MongoConfig {
  uri: string;
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  enabled: boolean;
}

export interface ClinicSettings {
  clinicName: string;
  doctorName: string;
  phone: string;
  address: string;
  receiptFooter: string;
  adminPin: string;
  currencyUnit: 'rial' | 'toman';
  mongoConfig?: MongoConfig;
}

export type TabType =
  | 'dashboard'
  | 'reception'
  | 'patients'
  | 'followups'
  | 'invoices'
  | 'management'
  | 'settings';
