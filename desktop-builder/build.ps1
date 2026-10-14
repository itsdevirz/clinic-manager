# -*- coding: utf-8 -*-
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "ساخت خروجی EXE نرم‌افزار مطب (Tauri)"

Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   سامانه جامع مدیریت کلینیک و مطب زیبایی - ساخت فایل اجرایی دسکتاپ (EXE)" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. رفتن به پوشه اصلی پروژه
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
Set-Location $ProjectRoot
Write-Host "[مسیر پروژه]: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

# 2. بررسی نصب بودن Node.js
Write-Host "[1/4] در حال بررسی Node.js..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[خطا] نرم‌افزار Node.js روی سیستم شما نصب نیست!" -ForegroundColor Red
    Write-Host "لطفاً Node.js نسخه LTS را از سایت رسمی دانلود و نصب فرمایید:" -ForegroundColor White
    Write-Host "  https://nodejs.org" -ForegroundColor Cyan
    Write-Host "یا دستور زیر را در ترمینال اجرا کنید:" -ForegroundColor White
    Write-Host "  winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "کلید Enter را برای خروج فشار دهید"
    Exit 1
}
$nodeVer = & node -v
Write-Host " [تایید] Node.js شناسایی شد: $nodeVer" -ForegroundColor Green
Write-Host ""

# 3. بررسی نصب بودن Rust و Cargo
Write-Host "[2/4] در حال بررسی کامپایلر Rust (کارگو)..." -ForegroundColor Yellow
$cargoCmd = Get-Command cargo -ErrorAction SilentlyContinue
if (-not $cargoCmd) {
    Write-Host "------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "[هشدار مهم] کامپایلر Rust (Cargo) روی ویندوز شما یافت نشد!" -ForegroundColor Red
    Write-Host "فریم‌ورک تائوری (Tauri) برای ساخت فایل EXE پرسرعت و امن، نیازمند زبان Rust است." -ForegroundColor White
    Write-Host ""
    Write-Host "روش نصب بسیار سریع و آسان (فقط یک‌بار):" -ForegroundColor Cyan
    Write-Host "1. وارد آدرس https://rustup.rs شوید و فایل rustup-init.exe را اجرا کنید." -ForegroundColor White
    Write-Host "2. همچنین اطمینان حاصل کنید C++ Build Tools فعال باشد." -ForegroundColor White
    Write-Host "   (می‌توانید اسکریپت install-rust-prerequisites.bat را اجرا کنید)" -ForegroundColor White
    Write-Host "------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host ""
    $openUrl = Read-Host "آیا مایلید صفحه دانلود Rust در مرورگر شما باز شود؟ (y/n)"
    if ($openUrl -eq 'y' -or $openUrl -eq 'Y') {
        Start-Process "https://rustup.rs"
    }
    Read-Host "پس از نصب Rust، این پنجره را ببندید و دوباره build-exe.bat را اجرا فرمایید. (Enter)"
    Exit 1
}
$cargoVer = & cargo --version
Write-Host " [تایید] کامپایلر Rust آماده است: $cargoVer" -ForegroundColor Green
Write-Host ""

# 4. نصب وابستگی‌های پکیج‌ها در صورت نیاز
Write-Host "[3/4] بررسی بسته‌ها و کتابخانه‌های پروژه (npm install)..." -ForegroundColor Yellow
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[خطا] در هنگام دریافت و آماده‌سازی بسته‌ها خطایی رخ داد!" -ForegroundColor Red
    Read-Host "کلید Enter را برای خروج فشار دهید"
    Exit 1
}
Write-Host " [تایید] کتابخانه‌ها آماده هستند." -ForegroundColor Green
Write-Host ""

# 5. ساخت فایل خروجی با Tauri
Write-Host "[4/4] در حال کامپایل پروژه و ساخت فایل نصبی و پرتابل EXE با Tauri..." -ForegroundColor Yellow
Write-Host "لطفاً شکیبا باشید؛ در اولین بار ساخت، کدهای نیتیو Rust کامپایل می‌شوند..." -ForegroundColor Gray
Write-Host ""

& npm run tauri:build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[خطا] ساخت فایل EXE با خطا مواجه شد." -ForegroundColor Red
    Write-Host "لطفاً بررسی کنید که Visual Studio C++ Build Tools نصب باشد." -ForegroundColor White
    Read-Host "کلید Enter را برای خروج فشار دهید"
    Exit 1
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  [تبریک] فایل اجرایی EXE سامانه مطب با موفقیت ساخته شد!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

$bundleDir = Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis"
$portableExe = Join-Path $ProjectRoot "src-tauri\target\release\ClinicManagement.exe"

Write-Host "مسیرهای فایل‌های خروجی:" -ForegroundColor White
Write-Host " 1. فایل نصبی ویندوز (Setup Installer):" -ForegroundColor Cyan
Write-Host "    $bundleDir" -ForegroundColor Gray
Write-Host " 2. فایل تک‌فایلی بدون نیاز به نصب (Portable EXE):" -ForegroundColor Cyan
Write-Host "    $portableExe" -ForegroundColor Gray
Write-Host ""

# باز کردن پوشه فایل خروجی در ویندوز اکسپلورر
if (Test-Path $bundleDir) {
    Start-Process "explorer.exe" $bundleDir
} elseif (Test-Path (Join-Path $ProjectRoot "src-tauri\target\release")) {
    Start-Process "explorer.exe" (Join-Path $ProjectRoot "src-tauri\target\release")
}

Write-Host "پوشه حاوی فایل‌های خروجی در ویندوز باز شد." -ForegroundColor Green
Read-Host "برای بستن این پنجره کلید Enter را فشار دهید"
