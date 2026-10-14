import React, { useMemo } from 'react';
import { AvanDatePicker, AvanProvider } from '@avan-persian/react/client';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  jalaliToGregorian,
  gregorianToJalali,
  getTodayPersianDate,
  addDaysToPersianDate,
  formatPersianDateReadable
} from '../../utils/persianDate';

interface PersianDatePickerProps {
  value: string; // Format YYYY/MM/DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  presets?: { label: string; days: number }[];
  showReadableDate?: boolean;
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ...',
  disabled = false,
  className = '',
  presets,
  showReadableDate = false,
}) => {
  const today = getTodayPersianDate();

  // Convert string (YYYY/MM/DD) to JS Date for AvanDatePicker
  const selectedDate = useMemo(() => {
    if (!value || !value.includes('/')) return null;
    const parts = value.split('/').map(Number);
    if (parts.length === 3 && parts[0] > 1300 && parts[1] >= 1 && parts[1] <= 12 && parts[2] >= 1 && parts[2] <= 31) {
      const [gy, gm, gd] = jalaliToGregorian(parts[0], parts[1], parts[2]);
      return new Date(gy, gm - 1, gd);
    }
    return null;
  }, [value]);

  // Convert JS Date back to Persian YYYY/MM/DD string
  const handleAvanChange = (newDate: Date | null) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const [jy, jm, jd] = gregorianToJalali(
      newDate.getFullYear(),
      newDate.getMonth() + 1,
      newDate.getDate()
    );
    const mm = String(jm).padStart(2, '0');
    const dd = String(jd).padStart(2, '0');
    onChange(`${jy}/${mm}/${dd}`);
  };

  const defaultPresets = presets !== undefined ? presets : [
    { label: 'امروز', days: 0 },
    { label: '۱ هفته بعد', days: 7 },
    { label: '۲ هفته بعد', days: 14 },
    { label: '۱ ماه بعد', days: 30 },
    { label: '۶ ماه بعد', days: 180 },
    { label: '۱۱ ماه بعد', days: 330 },
  ];

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-slate-600 mb-1 font-medium text-xs">
          {label}
        </label>
      )}

      {/* Avan Persian Date Picker Component with Provider */}
      <div className="relative avan-picker-wrapper">
        <AvanProvider dir="rtl" locale="fa-IR">
          <AvanDatePicker
            value={selectedDate}
            onChange={handleAvanChange}
            display="popover"
            dir="rtl"
            locale="fa-IR"
            closeOnSelect={true}
            showTodayButton={true}
            showClearButton={false}
            placeholder={placeholder}
            className="w-full text-xs font-mono tabular-nums"
          />
        </AvanProvider>
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <CalendarIcon className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Readable Date Label if explicitly enabled */}
      {showReadableDate && value && (
        <span className="text-[11px] text-slate-400 mt-1 block font-normal">
          {formatPersianDateReadable(value)}
        </span>
      )}

      {/* Quick Action Presets */}
      {defaultPresets && defaultPresets.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {defaultPresets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => {
                const target = addDaysToPersianDate(today, p.days);
                onChange(target);
              }}
              className="px-2 py-0.5 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 border border-slate-200/80 rounded-md text-[10px] font-medium text-slate-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
