@echo off
chcp 65001 >nul
title نصب پیش‌نیازهای ساخت EXE (Rust و Build Tools)
cls
echo ======================================================================
echo    راهنمای خودکار نصب پیش‌نیازهای خروجی EXE (Tauri + Rust)
echo ======================================================================
echo.
echo برنامه تائوری (Tauri) از موتور سبک‌وزن نیتیو ویندوز (WebView2) و کامپایلر Rust استفاده می‌کند.
echo مزیت فوق‌العاده آن حجم بسیار پایین (حدود ۱۰ مگابایت به جای ۱۵۰ مگابایت الکترون) و سرعت بسیار بالا است.
echo.
echo 1) نصب خودکار با Windows Package Manager (Winget):
echo    دستور زیر در حال تلاش برای نصب Rust است...
echo.

where winget >nul 2>nul
if %errorlevel% equ 0 (
    echo در حال نصب Rustup از طریق Winget...
    winget install Rustlang.Rustup -e --accept-package-agreements --accept-source-agreements
    echo.
    echo همچنین برای نصب C++ Build Tools:
    echo winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Workload.VCTools"
) else (
    echo دستور Winget در سیستم شما در دسترس نیست.
    echo لطفاً مرورگر خود را باز کرده و لینک‌های زیر را دانلود و نصب کنید:
    echo 1. دانلود Rust: https://rustup.rs (فایل rustup-init.exe)
    echo 2. دانلود C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    start https://rustup.rs
)

echo.
echo پس از پایان نصب، پنجره ترمینال را یک‌بار ببندید و مجدداً فایل build-exe.bat را اجرا کنید.
pause
