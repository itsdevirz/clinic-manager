// Persian Date & Number Utilities

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const PERSIAN_WEEKDAYS = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
];

/**
 * High-accuracy Gregorian to Solar Hijri conversion algorithm
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4)
    + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const sal_a = [
    0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  ];
  let gm = 0;
  while (gm < 13 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  return [gy, gm, days + 1];
}

export function getTodayPersianDate(): string {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const mm = String(jm).padStart(2, '0');
  const dd = String(jd).padStart(2, '0');
  return `${jy}/${mm}/${dd}`;
}

export function formatPersianDateReadable(dateStr: string): string {
  if (!dateStr || !dateStr.includes('/')) return dateStr || '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = PERSIAN_MONTHS[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

export function addDaysToPersianDate(persianDateStr: string, daysToAdd: number): string {
  if (!persianDateStr || !persianDateStr.includes('/')) return getTodayPersianDate();
  const [jy, jm, jd] = persianDateStr.split('/').map(Number);
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const date = new Date(gy, gm - 1, gd);
  date.setDate(date.getDate() + daysToAdd);
  const [newJy, newJm, newJd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${newJy}/${String(newJm).padStart(2, '0')}/${String(newJd).padStart(2, '0')}`;
}

export function comparePersianDates(dateA: string, dateB: string): number {
  return dateA.localeCompare(dateB);
}

export function parsePersianDate(dateStr: string): { year: number; month: number; day: number } {
  if (!dateStr || !dateStr.includes('/')) {
    const today = getTodayPersianDate();
    const parts = today.split('/').map(Number);
    return { year: parts[0] || 1403, month: parts[1] || 1, day: parts[2] || 1 };
  }
  const parts = dateStr.split('/').map(Number);
  return {
    year: parts[0] || 1403,
    month: Math.min(Math.max(parts[1] || 1, 1), 12),
    day: Math.min(Math.max(parts[2] || 1, 1), 31),
  };
}

export function buildPersianDate(year: number, month: number, day: number): string {
  const y = year || 1403;
  const m = String(Math.min(Math.max(month || 1, 1), 12)).padStart(2, '0');
  const d = String(Math.min(Math.max(day || 1, 1), 31)).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

export function getDaysInPersianMonth(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  // Esfand: check leap year
  const [gy] = jalaliToGregorian(year, 12, 1);
  const nextYearFirstDay = jalaliToGregorian(year + 1, 1, 1);
  const diffTime = new Date(nextYearFirstDay[0], nextYearFirstDay[1] - 1, nextYearFirstDay[2]).getTime() -
    new Date(gy, 11, 1).getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 30 ? 30 : 29;
}

export function isDateToday(dateStr: string): boolean {
  return dateStr === getTodayPersianDate();
}

export function isDateTomorrow(dateStr: string): boolean {
  const tomorrow = addDaysToPersianDate(getTodayPersianDate(), 1);
  return dateStr === tomorrow;
}

export function isDateWithinDays(dateStr: string, days: number): boolean {
  const today = getTodayPersianDate();
  const targetFuture = addDaysToPersianDate(today, days);
  return dateStr >= today && dateStr <= targetFuture;
}

export function getDaysDifference(targetDateStr: string, baseDateStr?: string): number {
  if (!targetDateStr) return 0;
  const base = baseDateStr || getTodayPersianDate();
  try {
    const [jy1, jm1, jd1] = targetDateStr.split('/').map(Number);
    const [gy1, gm1, gd1] = jalaliToGregorian(jy1, jm1, jd1);
    const [jy2, jm2, jd2] = base.split('/').map(Number);
    const [gy2, gm2, gd2] = jalaliToGregorian(jy2, jm2, jd2);
    const d1 = new Date(gy1, gm1 - 1, gd1);
    const d2 = new Date(gy2, gm2 - 1, gd2);
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function isDateOverdue(dateStr: string): boolean {
  const today = getTodayPersianDate();
  return dateStr < today;
}

export function toPersianDigits(n: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

export function formatNumberWithCommas(num: number | string): string {
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return '۰';
  return val.toLocaleString('fa-IR');
}

export function formatRial(amount: number): string {
  if (!amount && amount !== 0) return '۰ ریال';
  return `${amount.toLocaleString('fa-IR')} ریال`;
}

// Alias formatToman to formatRial so existing components display in Rials
export const formatToman = formatRial;
export const formatPrice = formatRial;

export function formatRialCompact(amount: number): string {
  if (amount >= 10000000000) {
    return `${(amount / 10000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد ریال`;
  }
  if (amount >= 10000000) {
    return `${(amount / 10000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} م ریال`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} هـ ریال`;
  }
  return `${amount.toLocaleString('fa-IR')} ریال`;
}

export const formatTomanCompact = formatRialCompact;

/**
 * Converts a numerical amount (in Rials) to Persian words
 * e.g. 15000000 -> "پانزده میلیون ریال"
 */
export function numberToPersianWords(num: number): string {
  if (!num || num === 0) return 'صفر ریال';
  if (isNaN(num)) return '';

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dah1 = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const dah2 = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const sadgan = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertThreeDigits(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const o = rem % 10;

    if (h > 0) {
      parts.push(sadgan[h]);
    }

    if (rem >= 10 && rem <= 19) {
      parts.push(dah1[rem - 10]);
    } else {
      if (t > 1) {
        parts.push(dah2[t]);
      }
      if (o > 0) {
        parts.push(yekan[o]);
      }
    }

    return parts.join(' و ');
  }

  const chunks: { value: number; scaleIndex: number }[] = [];
  let temp = Math.abs(num);
  let scaleIndex = 0;

  while (temp > 0) {
    const chunkVal = temp % 1000;
    if (chunkVal > 0) {
      chunks.push({ value: chunkVal, scaleIndex });
    }
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  chunks.reverse();

  const words = chunks
    .map(c => {
      const w = convertThreeDigits(c.value);
      const scale = scales[c.scaleIndex];
      return scale ? `${w} ${scale}` : w;
    })
    .join(' و ');

  return (num < 0 ? 'منفی ' : '') + words + ' ریال';
}

/**
 * Converts a numerical amount in Tomans to Persian words
 * e.g. 1000000 -> "یک میلیون تومان"
 */
export function numberToPersianWordsToman(tomanNum: number): string {
  if (!tomanNum || tomanNum === 0) return 'صفر تومان';
  if (isNaN(tomanNum)) return '';

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dah1 = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const dah2 = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const sadgan = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertThreeDigits(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const o = rem % 10;

    if (h > 0) parts.push(sadgan[h]);
    if (rem >= 10 && rem <= 19) {
      parts.push(dah1[rem - 10]);
    } else {
      if (t > 1) parts.push(dah2[t]);
      if (o > 0) parts.push(yekan[o]);
    }
    return parts.join(' و ');
  }

  const chunks: { value: number; scaleIndex: number }[] = [];
  let temp = Math.abs(tomanNum);
  let scaleIndex = 0;

  while (temp > 0) {
    const chunkVal = temp % 1000;
    if (chunkVal > 0) chunks.push({ value: chunkVal, scaleIndex });
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  chunks.reverse();

  const words = chunks
    .map(c => {
      const w = convertThreeDigits(c.value);
      const scale = scales[c.scaleIndex];
      return scale ? `${w} ${scale}` : w;
    })
    .join(' و ');

  return (tomanNum < 0 ? 'منفی ' : '') + words + ' تومان';
}

/**
 * Format amount in Toman with fa-IR locale
 */
export function formatTomanActual(rialAmount: number): string {
  if (!rialAmount && rialAmount !== 0) return '۰ تومان';
  const toman = Math.round(rialAmount / 10);
  return `${toman.toLocaleString('fa-IR')} تومان`;
}


