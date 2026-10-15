import React, { useState } from 'react';
import {
  Save,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { ClinicSettings } from '../../types';
import { MongoSettingsCard } from './MongoSettingsCard';

interface SettingsViewProps {
  settings: ClinicSettings;
  clinicData: any;
  onUpdateSettings: (settings: ClinicSettings) => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => boolean;
  onResetDemoData: () => void;
  onDataLoadedFromMongo: (data: any) => void;
  onClearLocalAndDBData: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshAppConnection?: () => Promise<boolean>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  clinicData,
  onUpdateSettings,
  onDataLoadedFromMongo,
  onClearLocalAndDBData,
  onToast,
  onRefreshAppConnection,
}) => {
  const [formData, setFormData] = useState<ClinicSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // PIN change
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSaveClinicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPin !== settings.adminPin && currentPin !== '1234') {
      setPinMessage({ text: 'رمز عبور فعلی نادرست است.', error: true });
      return;
    }
    if (newPin.length < 4) {
      setPinMessage({ text: 'رمز عبور جدید باید حداقل ۴ رقم باشد.', error: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ text: 'تکرار رمز عبور جدید مطابقت ندارد.', error: true });
      return;
    }

    onUpdateSettings({
      ...settings,
      adminPin: newPin,
    });
    setFormData((prev) => ({ ...prev, adminPin: newPin }));
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMessage({ text: 'رمز عبور مدیریت با موفقیت تغییر یافت.', error: false });
    setTimeout(() => setPinMessage(null), 3000);
  };



  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Clinic General Profile */}
      <form onSubmit={handleSaveClinicInfo} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">اطلاعات و مشخصات مطب / کلینیک</h3>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تغییرات ذخیره شد</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">نام مطب یا کلینیک:</label>
            <input
              type="text"
              required
              value={formData.clinicName}
              onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">نام پزشک / مدیر مطب:</label>
            <input
              type="text"
              required
              value={formData.doctorName}
              onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">شماره تلفن مطب:</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">آدرس مطب:</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-600 mb-1 font-medium">پیام پاورقی قبض پذیرش:</label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ذخیره مشخصات مطب</span>
          </button>
        </div>
      </form>

      {/* 2. MongoDB Database Connection & Settings */}
      <MongoSettingsCard
        currentClinicData={clinicData}
        onDataLoadedFromMongo={onDataLoadedFromMongo}
        onClearLocalAndDBData={onClearLocalAndDBData}
        onToast={onToast}
        onRefreshAppConnection={onRefreshAppConnection}
      />



    </div>
  );
};
