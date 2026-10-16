import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Clinic app render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-right">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-bold text-slate-900">نمایش این بخش با مشکل روبه‌رو شد</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              اطلاعات برنامه حذف نشده‌اند. لطفاً برنامه را دوباره بارگذاری کنید. اگر مشکل ادامه داشت، از بخش تنظیمات وضعیت اتصال و اطلاعات مطب را بررسی کنید.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
            >
              بارگذاری دوباره برنامه
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
