import React, { useState, useEffect } from 'react';
import { Search, X, User, Phone, FileText, ChevronLeft, Plus } from 'lucide-react';
import { Patient } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
  onOpenReceptionForPatient: (patientId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  patients,
  onSelectPatient,
  onOpenReceptionForPatient,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle or open handled outside or here
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = query.trim()
    ? patients.filter((p) => {
        const q = query.trim().toLowerCase();
        return (
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.nationalId.includes(q) ||
          p.phone.includes(q)
        );
      })
    : patients.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام بیمار، کد ملی یا تلفن همراه..."
            className="w-full text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="p-2 max-h-80 overflow-y-auto divide-y divide-slate-50 text-xs">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-400">بیماری با این مشخصات یافت نشد</div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="p-3 hover:bg-slate-50 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
                onClick={() => {
                  onSelectPatient(p.id);
                  onClose();
                }}
              >
                <div>
                  <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>کد ملی: <span className="font-mono tabular-nums">{p.nationalId || '—'}</span></span>
                    <span>·</span>
                    <span>تلفن: <span className="font-mono tabular-nums">{p.phone}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      onOpenReceptionForPatient(p.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-medium transition-colors"
                  >
                    + پذیرش
                  </button>
                  <button
                    onClick={() => {
                      onSelectPatient(p.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 text-slate-500 hover:text-slate-800 rounded-lg"
                  >
                    پرونده
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>کلید ESC برای بستن پنجره</span>
          <span className="font-mono">Ctrl+K برای جستجوی سریع</span>
        </div>
      </div>
    </div>
  );
};
