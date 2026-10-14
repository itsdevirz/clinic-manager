@echo off
chcp 65001 >nul
title رفع خطای link.exe و نصب C++ Build Tools
cls
echo ======================================================================
echo    راهنمای حل خطای: linker `link.exe` not found در ویندوز
echo ======================================================================
echo.
echo چرا با اینکه VS Build Tools را نصب کردید هنوز این ارور داده می‌شود؟
echo ----------------------------------------------------------------------
echo دلیل بسیار رایج:
echo در نصاب Build Tools مایکروسافت، به صورت پیش‌فرض هیچ کامپایلری تیک نخورده است!
echo شما حتماً باید تیک گزینه زیر را فعال کنید:
echo   [Desktop development with C++] (توسعه دسکتاپ با C++)
echo   به همراه: MSVC v143 و Windows 10/11 SDK
echo.
echo ======================================================================
echo   لطفاً یکی از راه‌حل‌های زیر را انتخاب نمایید:
echo ======================================================================
echo [1] باز کردن خودکار برنامه Visual Studio Installer (جهت زدن تیک Modify)
echo [2] نصب مستقیم و کامل پکیج با Winget (شامل C++ Tools و ویندوز SDK)
echo [3] اجرای ترمینال مخصوص ویژوال استودیو (Developer Command Prompt)
echo [4] دانلود مجدد نصاب مستقیم مایکروسافت (vs_BuildTools.exe)
echo [5] خروج
echo.
set /p choice="شماره گزینه را وارد کنید (1-5): "

if "%choice%"=="1" (
    echo.
    echo در حال باز کردن Visual Studio Installer...
    set "VSI=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\setup.exe"
    if not exist "%VSI%" set "VSI=%ProgramFiles%\Microsoft Visual Studio\Installer\setup.exe"
    if exist "%VSI%" (
        start "" "%VSI%"
        echo.
        echo پنل نصاب مایکروسافت باز شد. مراحل زیر را انجام دهید:
        echo ۱. روی دکمه Modify (ویرایش) کلیک کنید.
        echo ۲. تیک گزینه "Desktop development with C++" را فعال نمایید.
        echo ۳. در پایین سمت راست دکمه Modify را بزنید تا بسته‌ها نصب شوند.
        echo ۴. پس از اتمام نصب، کافیست مجدداً build-exe.bat را اجرا کنید.
    ) else (
        echo متأسفانه مسیر خودکار Visual Studio Installer یافت نشد. لطفاً در منوی استارت ویندوز عبارت "Visual Studio Installer" را جستجو و باز کنید.
    )
    echo.
    pause
    exit /b 0
)

if "%choice%"=="2" (
    echo.
    echo در حال اجرای دستور نصب کامل ابزارهای کامپایلر C++ از مایکروسافت...
    echo (این دستور پکیج کامل را به صورت خودکار دانلود و نصب می‌کند)
    echo.
    winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    echo.
    echo [پایان نصب] لطفاً اکنون فایل build-exe.bat را اجرا فرمایید.
    pause
    exit /b 0
)

if "%choice%"=="3" (
    echo.
    echo آموزش اجرای دستور در Developer Command Prompt:
    echo ۱. در منوی Start ویندوز سرچ کنید: "x64 Native Tools Command Prompt" یا "Developer Command Prompt"
    echo ۲. آن را باز کنید.
    echo ۳. دستور زیر را بزنید تا به پوشه پروژه بروید:
    echo    cd /d "%~dp0\.."
    echo ۴. سپس دستور ساخت را اجرا کنید:
    echo    npm run tauri:build
    echo.
    pause
    exit /b 0
)

if "%choice%"=="4" (
    echo.
    echo در حال دانلود فایل نصاب سبک رسمی مایکروسافت...
    powershell -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vs_BuildTools.exe' -OutFile '%~dp0vs_BuildTools.exe'"
    if exist "%~dp0vs_BuildTools.exe" (
        echo نصاب دانلود شد. در حال باز کردن...
        echo در پنجره باز شده، حتماً تیک "Desktop development with C++" را بزنید.
        start "" "%~dp0vs_BuildTools.exe"
    ) else (
        start https://visualstudio.microsoft.com/visual-cpp-build-tools/
    )
    pause
    exit /b 0
)

exit /b 0
