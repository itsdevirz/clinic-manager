import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit2,
  Check,
  Plus,
  Minus,
  Tag,
  DollarSign,
  Printer,
  AlertCircle
} from 'lucide-react';
import { Admission, Operator } from '../../types';
import {
  formatToman,
  formatTomanActual,
  numberToPersianWordsToman
} from '../../utils/persianDate';

interface EditAdmissionModalProps {
  admission: Admission | null;
  operators: Operator[];
  onClose: () => void;
  onSave: (updated: Admission) => void;
  onPrint?: (admission: Admission) => void;
}

export const EditAdmissionModal: React.FC<EditAdmissionModalProps> = ({
  admission,
  operators,
  onClose,
  onSave,
  onPrint,
}) => {
  const [serviceName, setServiceName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pricingType, setPricingType] = useState<'per_unit' | 'fixed_total'>('per_unit');
  const [unitPriceToman, setUnitPriceToman] = useState(0);
  const [totalPriceToman, setTotalPriceToman] = useState(0);
  const [discountToman, setDiscountToman] = useState(0);
  const [paidToman, setPaidToman] = useState(0);
  const [operatorId, setOperatorId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Sync state when admission changes
  useEffect(() => {
    if (admission) {
      setServiceName(admission.serviceName);
      const qty = admission.quantity || 1;
      setQuantity(qty);
      const unitToman = Math.round(admission.basePrice / 10);
      setUnitPriceToman(unitToman);
      setTotalPriceToman(unitToman * qty);
      setDiscountToman(Math.round(admission.discount / 10));
      setPaidToman(Math.round(admission.paidAmount / 10));
      setOperatorId(admission.operatorId);
      setNotes(admission.details.notes || '');
      setPaymentNotes(admission.paymentNotes || '');
    }
  }, [admission]);

  const consumablesTotal = useMemo(() => {
    if (!admission?.consumables) return 0;
    return admission.consumables.reduce((acc, c) => acc + (c.cost || 0), 0);
  }, [admission]);

  const rawTotalRial = useMemo(() => {
    return unitPriceToman * 10 * quantity + consumablesTotal;
  }, [unitPriceToman, quantity, consumablesTotal]);

  const discountRial = useMemo(() => {
    return discountToman * 10;
  }, [discountToman]);

  const finalPayableRial = useMemo(() => {
    return Math.max(0, rawTotalRial - discountRial);
  }, [rawTotalRial, discountRial]);

  const paidAmountRial = useMemo(() => {
    return paidToman * 10;
  }, [paidToman]);

  const debtRial = useMemo(() => {
    return Math.max(0, finalPayableRial - paidAmountRial);
  }, [finalPayableRial, paidAmountRial]);

  if (!admission) return null;

  const handleQuantityChange = (newQty: number) => {
    const val = Math.max(1, newQty);
    setQuantity(val);
    if (pricingType === 'fixed_total') {
      const unit = val > 0 ? Math.round(totalPriceToman / val) : totalPriceToman;
      setUnitPriceToman(unit);
    } else {
      setTotalPriceToman(unitPriceToman * val);
    }
  };

  const handleSetUnitPrice = (toman: number) => {
    const val = Math.max(0, toman);
    setUnitPriceToman(val);
    setTotalPriceToman(val * quantity);
  };

  const handleSetTotalPrice = (toman: number) => {
    const val = Math.max(0, toman);
    setTotalPriceToman(val);
    const unit = quantity > 0 ? Math.round(val / quantity) : val;
    setUnitPriceToman(unit);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const op = operators.find((o) => o.id === operatorId) || operators[0];

    const updated: Admission = {
      ...admission,
      serviceName: serviceName.trim() || admission.serviceName,
      operatorId: op ? op.id : admission.operatorId,
      operatorName: op ? op.name : admission.operatorName,
      basePrice: unitPriceToman * 10,
      quantity,
      discount: discountRial,
      finalAmount: finalPayableRial,
      paidAmount: paidAmountRial,
      debtAmount: debtRial,
      paymentNotes: paymentNotes.trim() || undefined,
      details: {
        ...admission.details,
        notes: notes || undefined,
      },
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                ویرایش پذیرش، تعداد و مبلغ خدمت
              </h3>
              <p className="text-[11px] text-slate-500">
                پرونده: {admission.patientName} · قبض: {admission.admissionNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Service Title */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              عنوان خدمت / اقدام درمانی:
            </label>
            <input
              type="text"
              required
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="عنوان خدمت..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 text-xs"
            />
          </div>

          {/* Quantity & Unit Pricing Section */}
          <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                تنظیم تعداد و قیمت توافقی دستی:
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPricingType('per_unit')}
                  className={`px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    pricingType === 'per_unit'
                      ? 'bg-sky-600 text-white font-bold border-sky-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  تعرفه هر واحد
                </button>
                <button
                  type="button"
                  onClick={() => setPricingType('fixed_total')}
                  className={`px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    pricingType === 'fixed_total'
                      ? 'bg-sky-600 text-white font-bold border-sky-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  مبلغ کل مقطوع
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Quantity */}
              <div>
                <label className="block text-slate-600 mb-1 font-medium">تعداد / واحد:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                    className="w-16 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-center font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {[1, 2, 3, 5, 10, 15, 20].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleQuantityChange(q)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                        quantity === q
                          ? 'bg-sky-700 text-white font-bold'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Input in Toman */}
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  {pricingType === 'fixed_total' ? 'مبلغ کل توافقی (تومان):' : 'تعرفه هر دانه/واحد (تومان):'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    value={pricingType === 'fixed_total' ? (totalPriceToman || '') : (unitPriceToman || '')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (pricingType === 'fixed_total') {
                        handleSetTotalPrice(val);
                      } else {
                        handleSetUnitPrice(val);
                      }
                    }}
                    placeholder="مبلغ به تومان..."
                    className="w-full pl-12 pr-3 py-1.5 bg-white border border-sky-300 rounded-xl font-mono tabular-nums text-left font-bold text-xs text-sky-900"
                  />
                  <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-medium">
                    تومان
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {[
                    { val: 100000, label: '۱۰۰ هـ' },
                    { val: 250000, label: '۲۵۰ هـ' },
                    { val: 500000, label: '۵۰۰ هـ' },
                    { val: 1000000, label: '۱ م' },
                    { val: 2000000, label: '۲ م' },
                    { val: 3000000, label: '۳ م' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        if (pricingType === 'fixed_total') {
                          handleSetTotalPrice(p.val);
                        } else {
                          handleSetUnitPrice(p.val);
                        }
                      }}
                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 hover:bg-sky-50 text-[10px] text-slate-700 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live calculation info */}
            <div className="p-2.5 bg-white rounded-xl border border-sky-100 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-slate-500">مجموع خدمت: </span>
                <span className="font-bold text-sky-800 font-mono">
                  {quantity} × {unitPriceToman.toLocaleString('fa-IR')} = {totalPriceToman.toLocaleString('fa-IR')} تومان
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[10px]">
                ({formatToman(totalPriceToman * 10)})
              </span>
            </div>
            <p className="text-[11px] text-sky-700 font-medium">
              به حروف: {numberToPersianWordsToman(totalPriceToman)}
            </p>
          </div>

          {/* Discount & Paid Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">تخفیف (تومان):</label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  value={discountToman || ''}
                  onChange={(e) => setDiscountToman(parseFloat(e.target.value) || 0)}
                  placeholder="۰"
                  className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums text-rose-600 font-bold text-xs"
                />
                <span className="absolute left-3 top-2 text-[10px] text-slate-400">تومان</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">مبلغ پرداختی (تومان):</label>
              <div className="relative">
                <input
                  type="number"
                  step="10000"
                  value={paidToman || ''}
                  onChange={(e) => setPaidToman(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono tabular-nums text-emerald-700 font-bold text-xs"
                />
                <span className="absolute left-3 top-2 text-[10px] text-slate-400">تومان</span>
              </div>
            </div>
          </div>

          {/* Operator Selection */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">پزشک / اپراتور انجام‌دهنده:</label>
            <select
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs cursor-pointer"
            >
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name} ({op.role === 'doctor' ? 'پزشک' : 'اپراتور'}) - سهم {op.commissionRate}٪
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Notes & Doctor Visit */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">توضیحات و ویزیت پزشک:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: نکات ویزیت و تشخیص پزشک، جزئیات نواحی، برند مصرفی..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Payment Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">توضیحات نحوه پرداخت (ثبت در پرونده):</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="مثال: ۵۰۰,۰۰۰ تومان نقد و مابقی پوز / شماره پیگیری کارت‌به‌کارت..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Summary Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">مبلغ نهایی قابل پرداخت:</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {formatTomanActual(finalPayableRial)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">مانده بدهی:</span>
              <span
                className={`font-bold font-mono text-sm ${
                  debtRial > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {debtRial > 0 ? formatTomanActual(debtRial) : 'تسویه کامل ✓'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            {onPrint && (
              <button
                type="button"
                onClick={() => onPrint(admission)}
                className="px-3 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-medium flex items-center gap-1.5 cursor-pointer text-xs mr-auto"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ فیش فعلی</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 rounded-xl transition-colors font-medium cursor-pointer text-xs"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره تغییرات پذیرش</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
