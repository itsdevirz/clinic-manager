@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ساخت خروجی EXE برنامه مطب (Tauri)
cls
echo ======================================================================
echo    سامانه مدیریت کلینیک و مطب زیبایی - ساخت فایل اجرایی دسکتاپ (EXE)
echo ======================================================================
echo.

:: 1. رفتن به پوشه اصلی پروژه
cd /d "%~dp0\.."

:: 2. بررسی نصب بودن Node.js
echo [1/4] در حال بررسی Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطا] نرم‌افزار Node.js روی سیستم شما نصب نیست!
    echo لطفاً Node.js را از آدرس https://nodejs.org دانلود و نصب فرمایید.
    echo یا دستور زیر را در پاورشل اجرا کنید:
    echo   winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)
node -v
echo [تایید] Node.js یافت شد.
echo.

:: 3. بررسی و لود خودکار محیط MSVC و link.exe
echo [2/4] در حال بررسی کامپایلر C++ و ابزار لینکر ویندوز (link.exe)...
where link.exe >nul 2>nul
if %errorlevel% neq 0 (
    echo لینکر در PATH پیش‌فرض نبود؛ در حال جستجوی خودکار مسیر Visual Studio...
    set "VS_VCVARS="
    
    set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
    if not exist "!VSWHERE!" set "VSWHERE=%ProgramFiles%\Microsoft Visual Studio\Installer\vswhere.exe"
    
    if exist "!VSWHERE!" (
        for /f "usebackq tokens=*" %%i in (`"!VSWHERE!" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
            if exist "%%i\VC\Auxiliary\Build\vcvars64.bat" set "VS_VCVARS=%%i\VC\Auxiliary\Build\vcvars64.bat"
        )
    )
    
    if not defined VS_VCVARS (
        if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" set "VS_VCVARS=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
        if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" set "VS_VCVARS=%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
        if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" set "VS_VCVARS=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
        if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" set "VS_VCVARS=%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
        if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat" set "VS_VCVARS=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
        if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" set "VS_VCVARS=%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
    )
    
    if defined VS_VCVARS (
        echo محیط C++ شناسایی شد، در حال فعال‌سازی متغیرهای محیطی...
        call "!VS_VCVARS!" >nul 2>nul
    )
)

where link.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [تایید] کامپایلر و لینکر مایکروسافت (link.exe) با موفقیت لود شد.
) else (
    echo ------------------------------------------------------------------
    echo [توجه بسیار مهم]
    echo ابزار لینکر مایکروسافت (link.exe) هنوز فعال نشده است.
    echo اگر Build Tools را نصب کرده‌اید، به احتمال زیاد تیک گزینه زیر را نزده بودید:
    echo   [Desktop development with C++]
    echo.
    echo برای رفع این مشکل، فایل fix-linker-error.bat را اجرا کنید
    echo یا Visual Studio Installer را باز کرده و دکمه Modify را بزنید و تیک فوق را فعال کنید.
    echo ------------------------------------------------------------------
    echo تلاش برای ادامه بیلد...
)
echo.

:: 4. بررسی نصب بودن Rust و Cargo
echo [3/4] در حال بررسی کامپایلر Rust (کارگو)...
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo ------------------------------------------------------------------
    echo [هشدار مهم] کامپایلر Rust روی سیستم شما شناسایی نشد!
    echo تائوری (Tauri) برای تولید فایل EXE کامپایل‌شده به زبان Rust نیاز دارد.
    echo.
    echo راه حل آسان:
    echo 1. وارد سایت https://rustup.rs شده و فایل rustup-init.exe را دانلود و نصب کنید.
    echo 2. فایل install-rust-prerequisites.bat درون همین پوشه را اجرا نمایید.
    echo ------------------------------------------------------------------
    echo.
    pause
    exit /b 1
)
cargo -v
echo [تایید] کامپایلر Rust آماده است.
echo.

:: 5. نصب وابستگی‌های پکیج‌ها در صورت نیاز
echo [4/4] بررسی بسته‌ها و شروع ساخت فایل اجرایی EXE...
call npm install
if %errorlevel% neq 0 (
    echo [خطا] در هنگام دریافت بسته‌ها خطایی رخ داد!
    pause
    exit /b 1
)
echo.

:: 6. ساخت فایل خروجی با Tauri
echo در حال بیلد پروژه با Tauri (این فرایند در اجرای اول چند دقیقه طول می‌کشد)...
call npm run tauri:build

if %errorlevel% neq 0 (
    echo.
    echo ==================================================================
    echo [خطا] ساخت فایل EXE با مشکل مواجه شد!
    echo اگر خطا مربوط به `link.exe not found` است:
    echo 1. پنجره Visual Studio Installer را از منوی Start ویندوز باز کنید.
    echo 2. روی گزینه Modify (ویرایش) کلیک کنید.
    echo 3. حتماً تیک "Desktop development with C++" را فعال کرده و Install/Modify را بزنید.
    echo 4. یا فایل fix-linker-error.bat در همین پوشه را اجرا نمایید.
    echo ==================================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo   [موفقیت] فایل خروجی EXE با موفقیت ساخته شد!
echo ======================================================================
echo.
echo فایل‌های خروجی در مسیرهای زیر قرار دارند:
echo 1) فایل نصبی ویندوز (NSIS Setup):
echo    src-tauri\target\release\bundle\nsis\
echo.
echo 2) فایل اجرایی بدون نیاز به نصب (Portable EXE):
echo    src-tauri\target\release\ClinicManagement.exe
echo.

:: کپی ملزومات بکند در کنار فایل اجرایی تائوری
if exist "%~dp0..\dist-server\backend-server.exe" copy /y "%~dp0..\dist-server\backend-server.exe" "%~dp0..\src-tauri\target\release\" >nul 2>nul
if exist "%~dp0..\dist-server\server.cjs" (
    if not exist "%~dp0..\src-tauri\target\release\dist-server" mkdir "%~dp0..\src-tauri\target\release\dist-server" >nul 2>nul
    copy /y "%~dp0..\dist-server\server.cjs" "%~dp0..\src-tauri\target\release\dist-server\" >nul 2>nul
)
if exist "%~dp0..\mysql-config.json" copy /y "%~dp0..\mysql-config.json" "%~dp0..\src-tauri\target\release\" >nul 2>nul

:: باز کردن پوشه فایل‌های خروجی در ویندوز اکسپلورر
if exist "%~dp0..\src-tauri\target\release\bundle\nsis" (
    start "" "%~dp0..\src-tauri\target\release\bundle\nsis"
) else (
    start "" "%~dp0..\src-tauri\target\release"
)

echo پوشه حاوی فایل‌های اجرایی برای شما باز شد.
echo کلید اینتر را بزنید تا پنجره بسته شود...
pause >nul
