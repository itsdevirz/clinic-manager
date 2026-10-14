@echo off
chcp 65001 >nul
title اجرای زنده برنامه دسکتاپ (Tauri Dev Mode)
cls
echo ======================================================================
echo    اجرای زنده سامانه مطب و کلینیک به صورت نرم‌افزار دسکتاپ ویندوز
echo ======================================================================
echo.

cd /d "%~dp0\.."

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطا] برای اجرای زنده دسکتاپ، ابتدا باید Rust نصب باشد.
    echo به سایت https://rustup.rs مراجعه کنید.
    pause
    exit /b 1
)

echo در حال راه‌اندازی پنجره دسکتاپ با قابلیت بروزرسانی زنده (Live Reload)...
call npm run tauri:dev

pause
