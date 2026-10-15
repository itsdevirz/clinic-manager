import {
  Patient,
  ServiceDefinition,
  Operator,
  Admission,
  FollowUpReminder,
  Shareholder,
  ClinicSettings
} from '../types';
import { getTodayPersianDate, addDaysToPersianDate } from './persianDate';

const today = getTodayPersianDate();
const yesterday = addDaysToPersianDate(today, -1);
const threeDaysAgo = addDaysToPersianDate(today, -3);
const lastMonth = addDaysToPersianDate(today, -28);

export const INITIAL_SERVICES: ServiceDefinition[] = [
  // ==========================================
  // ۱. خدمات لیزر بانوان (Women Laser Services)
  // ==========================================
  {
    id: 'srv-lw-total-vip',
    category: 'laser_women',
    name: 'لیزر توتال بادی VIP (بانوان)',
    defaultPrice: 15000000, // 1,500,000 تومان = 15,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر توتال بادی VIP بانوان',
    active: true,
  },
  {
    id: 'srv-lw-total',
    category: 'laser_women',
    name: 'لیزر توتال بادی (بانوان)',
    defaultPrice: 11000000, // 1,100,000 تومان = 11,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر توتال بادی بانوان',
    active: true,
  },
  {
    id: 'srv-lw-full-belly-butt',
    category: 'laser_women',
    name: 'لیزر فول بادی و شکم و باسن (بانوان)',
    defaultPrice: 10000000, // 1,000,000 تومان = 10,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر فول بادی، شکم و باسن',
    active: true,
  },
  {
    id: 'srv-lw-full-standard',
    category: 'laser_women',
    name: 'لیزر فول بادی (کل دست و پا، زیر بغل و بیکینی) بانوان',
    defaultPrice: 8000000, // 800,000 تومان = 8,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر فول بادی بانوان',
    active: true,
  },
  {
    id: 'srv-lw-practical',
    category: 'laser_women',
    name: 'لیزر کاربردی (ساق دست و پا، زیر بغل و بیکینی) بانوان',
    defaultPrice: 6000000, // 600,000 تومان = 6,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی پکیج کاربردی لیزر بانوان',
    active: true,
  },
  {
    id: 'srv-lw-economic',
    category: 'laser_women',
    name: 'لیزر اقتصادی (کل پا، زیر بغل و بیکینی) بانوان',
    defaultPrice: 6000000, // 600,000 تومان = 6,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی پکیج اقتصادی لیزر بانوان',
    active: true,
  },
  {
    id: 'srv-lw-lower-body',
    category: 'laser_women',
    name: 'لیزر کمر به پایین (بیکینی و کل پا) بانوان',
    defaultPrice: 6000000, // 600,000 تومان = 6,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر کمر به پایین بانوان',
    active: true,
  },
  {
    id: 'srv-lw-pool',
    category: 'laser_women',
    name: 'لیزر استخری (کل دست و کل پا) بانوان',
    defaultPrice: 6000000, // 600,000 تومان = 6,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی پکیج استخری بانوان',
    active: true,
  },
  {
    id: 'srv-lw-legs-full',
    category: 'laser_women',
    name: 'لیزر کل پا (بانوان)',
    defaultPrice: 4000000, // 400,000 تومان = 4,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر کل پا',
    active: true,
  },
  {
    id: 'srv-lw-arms-full',
    category: 'laser_women',
    name: 'لیزر کل دست (بانوان)',
    defaultPrice: 3000000, // 300,000 تومان = 3,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر کل دست',
    active: true,
  },
  {
    id: 'srv-lw-half-arm',
    category: 'laser_women',
    name: 'لیزر نصف دست (بانوان)',
    defaultPrice: 1500000, // 150,000 تومان = 1,500,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر نصف دست',
    active: true,
  },
  {
    id: 'srv-lw-lower-legs-arms',
    category: 'laser_women',
    name: 'لیزر ساق پا و ساق دست (بانوان)',
    defaultPrice: 4000000, // 400,000 تومان = 4,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر ساق پا و ساق دست',
    active: true,
  },
  {
    id: 'srv-lw-bikini-butt',
    category: 'laser_women',
    name: 'لیزر بیکینی و خط باسن (بانوان)',
    defaultPrice: 2500000, // 250,000 تومان = 2,500,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر بیکینی و خط باسن',
    active: true,
  },
  {
    id: 'srv-lw-armpits',
    category: 'laser_women',
    name: 'لیزر زیر بغل (بانوان)',
    defaultPrice: 2000000, // 200,000 تومان = 2,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر زیر بغل',
    active: true,
  },
  {
    id: 'srv-lw-bikini-armpits',
    category: 'laser_women',
    name: 'لیزر بیکینی و زیر بغل (بانوان)',
    defaultPrice: 3500000, // 350,000 تومان = 3,500,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر بیکینی و زیر بغل',
    active: true,
  },
  {
    id: 'srv-lw-bikini-armpits-face',
    category: 'laser_women',
    name: 'لیزر بیکینی، زیر بغل و صورت (بانوان)',
    defaultPrice: 4500000, // 450,000 تومان = 4,500,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر بیکینی، زیر بغل و صورت',
    active: true,
  },
  {
    id: 'srv-lw-face',
    category: 'laser_women',
    name: 'لیزر صورت (بانوان)',
    defaultPrice: 2500000, // 250,000 تومان = 2,500,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر صورت',
    active: true,
  },
  {
    id: 'srv-lw-neck',
    category: 'laser_women',
    name: 'لیزر زیر گردن (بانوان)',
    defaultPrice: 1000000, // 100,000 تومان = 1,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر زیر گردن',
    active: true,
  },

  // ==========================================
  // ۲. خدمات لیزر آقایان (Men Laser Services)
  // ==========================================
  {
    id: 'srv-lm-total',
    category: 'laser_men',
    name: 'لیزر توتال بادی (تمام صورت و بدن) آقایان',
    defaultPrice: 20000000, // 2,000,000 تومان = 20,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر توتال بادی آقایان',
    active: true,
  },
  {
    id: 'srv-lm-full',
    category: 'laser_men',
    name: 'لیزر فول بادی (گردن به پایین) آقایان',
    defaultPrice: 16000000, // 1,600,000 تومان = 16,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر فول بادی آقایان',
    active: true,
  },
  {
    id: 'srv-lm-chest-belly',
    category: 'laser_men',
    name: 'لیزر سینه و شکم (آقایان)',
    defaultPrice: 8000000, // 800,000 تومان = 8,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر سینه و شکم آقایان',
    active: true,
  },
  {
    id: 'srv-lm-back',
    category: 'laser_men',
    name: 'لیزر پشت و کمر (آقایان)',
    defaultPrice: 8000000, // 800,000 تومان = 8,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر پشت و کمر آقایان',
    active: true,
  },
  {
    id: 'srv-lm-bikini',
    category: 'laser_men',
    name: 'لیزر بیکینی (آقایان)',
    defaultPrice: 5000000, // 500,000 تومان = 5,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر بیکینی آقایان',
    active: true,
  },
  {
    id: 'srv-lm-upper-body',
    category: 'laser_men',
    name: 'لیزر بالاتنه (پشت، سینه، دست‌ها و زیربغل) آقایان',
    defaultPrice: 13000000, // 1,300,000 تومان = 13,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر بالاتنه آقایان',
    active: true,
  },
  {
    id: 'srv-lm-arms',
    category: 'laser_men',
    name: 'لیزر کل دست‌ها (آقایان)',
    defaultPrice: 6000000, // 600,000 تومان = 6,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر کل دست آقایان',
    active: true,
  },
  {
    id: 'srv-lm-legs',
    category: 'laser_men',
    name: 'لیزر کل پاها (آقایان)',
    defaultPrice: 7000000, // 700,000 تومان = 7,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر کل پا آقایان',
    active: true,
  },
  {
    id: 'srv-lm-armpits',
    category: 'laser_men',
    name: 'لیزر زیربغل (آقایان)',
    defaultPrice: 3500000, // 350,000 تومان = 3,500,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر زیربغل آقایان',
    active: true,
  },
  {
    id: 'srv-lm-beard-neck',
    category: 'laser_men',
    name: 'لیزر آنکارد صورت و گردن (آقایان)',
    defaultPrice: 4000000, // 400,000 تومان = 4,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی آنکارد ریش و گردن آقایان',
    active: true,
  },
  {
    id: 'srv-lm-torso-armpits',
    category: 'laser_men',
    name: 'لیزر سینه، شکم، پشت و زیربغل (آقایان)',
    defaultPrice: 12000000, // 1,200,000 تومان = 12,000,000 ریال
    defaultSessions: 8,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی لیزر بالاتنه کامل آقایان',
    active: true,
  },

  // ==========================================
  // ۳. خدمات زیبایی پزشک مرکز (Doctor Aesthetic Services)
  // ==========================================
  // بوتاکس
  {
    id: 'srv-dr-botox-face',
    category: 'botox',
    name: 'بوتاکس کلی صورت',
    defaultPrice: 18000000, // 1,800,000 تومان = 18,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 120,
    followUpNoteDefault: 'ترمیم یا تمدید بوتاکس صورت (۱۴ روز ترمیم، ۴ ماه تمدید)',
    active: true,
  },
  {
    id: 'srv-dr-botox-armpits',
    category: 'botox',
    name: 'بوتاکس زیربغل (کنترل تعریق)',
    defaultPrice: 30000000, // 3,000,000 تومان = 30,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 180,
    followUpNoteDefault: 'تمدید بوتاکس زیربغل (۶ ماه بعد)',
    active: true,
  },
  {
    id: 'srv-dr-botox-migraine',
    category: 'botox',
    name: 'بوتاکس صورت و میگرن',
    defaultPrice: 30000000, // 3,000,000 تومان = 30,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 120,
    followUpNoteDefault: 'چکاپ و تمدید بوتاکس درمانی میگرن',
    active: true,
  },

  // فیلر و ژل
  {
    id: 'srv-dr-filler-lip',
    category: 'filler',
    name: 'فیلر لب (1cc)',
    defaultPrice: 35000000, // 3,500,000 تومان (شروع از ۳.۵ م) = 35,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'چکاپ تقارن و ویزیت ترمیم فیلر لب',
    active: true,
  },
  {
    id: 'srv-dr-filler-jawline',
    category: 'filler',
    name: 'فیلر زاویه سازی صورت',
    defaultPrice: 25000000, // 2,500,000 تومان = 25,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'چکاپ فرم‌دهی و زاویه فک',
    active: true,
  },
  {
    id: 'srv-dr-filler-fullface',
    category: 'filler',
    name: 'فیلر فول فیس (جوانسازی کامل)',
    defaultPrice: 250000000, // 25,000,000 تومان = 250,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 21,
    followUpNoteDefault: 'ویزیت کنترل و ارزیابی فیلر فول فیس',
    active: true,
  },
  {
    id: 'srv-dr-filler-genital',
    category: 'filler',
    name: 'فیلر ژنیتال (هر سی سی)',
    defaultPrice: 25000000, // 2,500,000 تومان = 25,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 21,
    followUpNoteDefault: 'معاینه و فالوآپ فیلر ژنیتال',
    active: true,
  },
  {
    id: 'srv-dr-filler-undereye',
    category: 'filler',
    name: 'فیلر زیر چشم (1cc)',
    defaultPrice: 55000000, // 5,500,000 تومان = 55,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'چکاپ و بررسی گودی زیر چشم',
    active: true,
  },
  {
    id: 'srv-dr-mono-threads',
    category: 'filler',
    name: 'نخ مونو جوانساز (پک ده تایی)',
    defaultPrice: 35000000, // 3,500,000 تومان = 35,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 45,
    followUpNoteDefault: 'بررسی کلاژن‌سازی نخ‌های مونو جوانساز',
    active: true,
  },
  {
    id: 'srv-dr-mesogel',
    category: 'mesogel',
    name: 'مزوژل جوانساز (پروفایلو / جالپرو)',
    defaultPrice: 60000000, // 6,000,000 تومان = 60,000,000 ریال
    defaultSessions: 2,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه دوم تزریق مزوژل جوانساز',
    active: true,
  },

  // مزوتراپی و سابسیژن
  {
    id: 'srv-dr-meso-hair',
    category: 'mesotherapy',
    name: 'مزوتراپی ریزش مو، جوانساز (1cc)',
    defaultPrice: 18000000, // 1,800,000 تومان = 18,000,000 ریال
    defaultSessions: 4,
    followUpDaysDefault: 21,
    followUpNoteDefault: 'جلسه بعدی مزوتراپی (۳ هفته بعد)',
    active: true,
  },
  {
    id: 'srv-dr-meso-microneedling',
    category: 'mesotherapy',
    name: 'مزوتراپی با میکرونیدلینگ',
    defaultPrice: 20000000, // 2,000,000 تومان = 20,000,000 ریال
    defaultSessions: 4,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی مزونیدلینگ جوانساز',
    active: true,
  },
  {
    id: 'srv-dr-subcision',
    category: 'mesotherapy',
    name: 'سابسیژن جای جوش',
    defaultPrice: 10000000, // 1,000,000 تومان = 10,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'معاینه و جلسه بعدی سابسیژن اسکارهای پوستی',
    active: true,
  },
  {
    id: 'srv-dr-alopecia-areata',
    category: 'mesotherapy',
    name: 'درمان ریزش موی سکه ای',
    defaultPrice: 8000000, // 800,000 تومان = 8,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 21,
    followUpNoteDefault: 'بررسی رویش مو در موضع آلوپسی سکه‌ای',
    active: true,
  },

  // پی آر پی (PRP)
  {
    id: 'srv-dr-prp-full',
    category: 'prp',
    name: 'PRP سر و صورت و دست',
    defaultPrice: 65000000, // 6,500,000 تومان = 65,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی پی‌آرپی فول (سر، صورت و دست)',
    active: true,
  },
  {
    id: 'srv-dr-prp-single',
    category: 'prp',
    name: 'PRP ریزش مو / صورت / دست (تک ناحیه)',
    defaultPrice: 25000000, // 2,500,000 تومان = 25,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی پی‌آرپی تخصصی',
    active: true,
  },
  {
    id: 'srv-dr-prp-head-face',
    category: 'prp',
    name: 'PRP سر و صورت',
    defaultPrice: 45000000, // 4,500,000 تومان = 45,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی پی‌آرپی سر و صورت',
    active: true,
  },
  {
    id: 'srv-dr-prp-eyes',
    category: 'prp',
    name: 'PRP تیرگی زیر چشم',
    defaultPrice: 15000000, // 1,500,000 تومان = 15,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی پی‌آرپی رفع تیرگی زیر چشم',
    active: true,
  },

  // هایفوتراپی
  {
    id: 'srv-dr-hifu-forehead-eyes',
    category: 'hifu',
    name: 'هایفوتراپی پیشانی و اطراف چشم',
    defaultPrice: 15000000, // 1,500,000 تومان = 15,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 180,
    followUpNoteDefault: 'چکاپ ۶ ماهه نتایج هایفوتراپی پیشانی و چشم',
    active: true,
  },
  {
    id: 'srv-dr-hifu-cheeks',
    category: 'hifu',
    name: 'هایفوتراپی گونه',
    defaultPrice: 15000000, // 1,500,000 تومان = 15,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 180,
    followUpNoteDefault: 'چکاپ ۶ ماهه لیفت هایفو گونه',
    active: true,
  },
  {
    id: 'srv-dr-hifu-jaw-doublechin',
    category: 'hifu',
    name: 'هایفوتراپی چانه و خط فک و غبغب',
    defaultPrice: 15000000, // 1,500,000 تومان = 15,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 180,
    followUpNoteDefault: 'چکاپ ۶ ماهه هایفوتراپی فک و غبغب',
    active: true,
  },
  {
    id: 'srv-dr-hifu-full-face',
    category: 'hifu',
    name: 'هایفوتراپی کل صورت و غبغب',
    defaultPrice: 35000000, // 3,500,000 تومان = 35,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 180,
    followUpNoteDefault: 'چکاپ ۶ ماهه لیفت کامل صورت و غبغب با هایفو',
    active: true,
  },

  // لیزر کیوسوییچ و کربن تراپی
  {
    id: 'srv-dr-qswitch-tattoo',
    category: 'tattoo_face',
    name: 'لیزر کیوسوییچ (تتو)',
    defaultPrice: 10000000, // 1,000,000 تومان = 10,000,000 ریال
    defaultSessions: 4,
    followUpDaysDefault: 35,
    followUpNoteDefault: 'جلسه بعدی ریمو تتو با کیوسوییچ',
    active: true,
  },
  {
    id: 'srv-dr-carbon-body',
    category: 'carbon',
    name: 'کربن تراپی لیزر کیوسوییچ و بدن',
    defaultPrice: 18000000, // 1,800,000 تومان = 18,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی کربن تراپی بدن',
    active: true,
  },
  {
    id: 'srv-dr-carbon-knees-armpits',
    category: 'carbon',
    name: 'کربن تراپی زیر بغل / زانو',
    defaultPrice: 18000000, // 1,800,000 تومان = 18,000,000 ریال
    defaultSessions: 3,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'جلسه بعدی کربن تراپی روشن‌سازی زیربغل و زانو',
    active: true,
  },

  // جراحی‌های سرپایی و لیفت
  {
    id: 'srv-dr-doublechin-suction',
    category: 'surgery',
    name: 'ساکشن غبغب',
    defaultPrice: 120000000, // 12,000,000 تومان = 120,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 7,
    followUpNoteDefault: 'کشیدن بخیه و بررسی بهبودی ساکشن غبغب',
    active: true,
  },
  {
    id: 'srv-dr-blepharoplasty',
    category: 'surgery',
    name: 'بلفاروپلاستی',
    defaultPrice: 150000000, // 15,000,000 تومان = 150,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 7,
    followUpNoteDefault: 'کشیدن بخیه‌ها و معاینه روند بهبودی پلک',
    active: true,
  },
  {
    id: 'srv-dr-brow-lift',
    category: 'surgery',
    name: 'لیفت دایرکت ابرو',
    defaultPrice: 120000000, // 12,000,000 تومان = 120,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 7,
    followUpNoteDefault: 'معاینه و کشیدن بخیه‌های لیفت ابرو',
    active: true,
  },

  // ضایعات پوستی و موی سفید
  {
    id: 'srv-dr-mole-flat',
    category: 'mole',
    name: 'خال برداری مسطح',
    defaultPrice: 2500000, // 250,000 تومان = 2,500,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'ترمیم جای زخم و مصرف کرم ترمیم‌کننده',
    active: true,
  },
  {
    id: 'srv-dr-skintag',
    category: 'mole',
    name: 'برداشتن اسکین تگ',
    defaultPrice: 2000000, // 200,000 تومان = 2,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'بررسی ترمیم موضع اسکین تگ',
    active: true,
  },
  {
    id: 'srv-dr-mole-large',
    category: 'mole',
    name: 'خال گوشتی بزرگ',
    defaultPrice: 5000000, // 500,000 تومان = 5,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'معاینه و بررسی جای برداشت خال گوشتی',
    active: true,
  },
  {
    id: 'srv-dr-white-hair',
    category: 'white_hair',
    name: 'برداشت موی سفید هر عدد',
    defaultPrice: 400000, // 40,000 تومان = 400,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'چکاپ ریشه موهای سفید الکترولیز شده',
    active: true,
  },

  // پیرسینگ و ویزیت
  {
    id: 'srv-dr-piercing',
    category: 'piercing',
    name: 'پیرسینگ استریل',
    defaultPrice: 5000000, // 500,000 تومان = 5,000,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 14,
    followUpNoteDefault: 'معاینه و بررسی بهبودی موضع پیرسینگ',
    active: true,
  },
  {
    id: 'srv-dr-visit',
    category: 'visit',
    name: 'ویزیت پزشک',
    defaultPrice: 3600000, // 360,000 تومان = 3,600,000 ریال
    defaultSessions: 1,
    followUpDaysDefault: 30,
    followUpNoteDefault: 'پیگیری درمان و ویزیت مجدد پزشک',
    active: true,
  },
];

export const INITIAL_OPERATORS: Operator[] = [];

export const INITIAL_CONSUMABLES = [
  { name: 'عینک محافظ', cost: 0 },
  { name: 'حوله یکبار مصرف', cost: 250000 },
  { name: 'کرم بی‌حسی زایلاپی', cost: 600000 },
  { name: 'سری شخصی دستگاه لیزر', cost: 1200000 },
  { name: 'ژیلت و وسایل بهداشتی', cost: 200000 },
  { name: 'پد الکلی و گاز استریل', cost: 150000 },
  { name: 'سرسوزن مزوتراپی گیج ۳۰/۳۲', cost: 350000 },
];

export const INITIAL_SHAREHOLDERS: Shareholder[] = [];

export const INITIAL_SETTINGS: ClinicSettings = {
  clinicName: 'مطب و کلینیک زیبایی',
  doctorName: '',
  phone: '',
  address: '',
  receiptFooter: 'سلامتی و زیبایی شما اولویت ماست.',
  adminPin: '1234',
  currencyUnit: 'rial',
};

export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_ADMISSIONS: Admission[] = [];

export const INITIAL_FOLLOW_UPS: FollowUpReminder[] = [];
