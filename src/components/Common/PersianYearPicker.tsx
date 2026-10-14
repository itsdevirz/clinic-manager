import React from 'react';
import { AvanYearPicker, AvanProvider } from '@avan-persian/react/client';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft } from 'lucide-react';

interface PersianYearPickerProps {
  value: number; // Jalali Year (e.g. 1405)
  onChange: (year: number) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showStepper?: boolean;
  minYear?: number;
  maxYear?: number;
}

export const PersianYearPicker: React.FC<PersianYearPickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب سال...',
  className = '',
  showStepper = true,
  minYear = 1350,
  maxYear = 1460,
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="block text-slate-700 font-semibold text-xs">
          {label}
        </label>
      )}

      <div className="flex items-center gap-1.5">
        {/* Stepper Down (Previous Year) */}
        {showStepper && (
          <button
            type="button"
            onClick={() => onChange(value - 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="یک سال قبل‌تر"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Avan Year Picker Popover */}
        <div className="relative avan-picker-wrapper w-36 sm:w-40 shrink-0">
          <AvanProvider dir="rtl" locale="fa-IR">
            <AvanYearPicker
              value={value || null}
              onChange={(newYear) => {
                if (newYear && typeof newYear === 'number') {
                  onChange(newYear);
                }
              }}
              display="popover"
              dir="rtl"
              locale="fa-IR"
              closeOnSelect={true}
              minYear={minYear}
              maxYear={maxYear}
              placeholder={placeholder}
              className="w-full text-xs font-mono font-bold tabular-nums"
            />
          </AvanProvider>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Stepper Up (Next Year) */}
        {showStepper && (
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="یک سال بعدتر"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
