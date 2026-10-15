#!/bin/bash
# ==============================================================================
# اسکریپت ساخت فایل اجرایی دسکتاپ ویندوز (Tauri EXE) و بکند در لینوکس
# Automated Linux Build Script for Clinic Management Tauri Windows EXE
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${PURPLE}   سامانه مدیریت کلینیک و مطب زیبایی - ساخت خروجی ویندوز (EXE) در لینوکس${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo ""

# ------------------------------------------------------------------------------
# 1. بررسی Node.js و npm
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] در حال بررسی Node.js و npm...${NC}"
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[خطا] Node.js روی سیستم شما نصب نیست!${NC}"
    echo "لطفاً ابتدا Node.js را نصب کنید (نسخه ۱۸ یا بالاتر):"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}✓ Node.js یافت شد: $NODE_VER${NC}"

# ------------------------------------------------------------------------------
# 2. بررسی Rust و Cargo
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/6] در حال بررسی کامپایلر Rust (کارگو)...${NC}"
if ! command -v cargo >/dev/null 2>&1; then
    echo -e "${RED}[خطا] کامپایلر Rust (Cargo) روی لینوکس شما نصب نیست!${NC}"
    echo "برای نصب استاندارد Rust دستور زیر را اجرا کنید:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "سپس ترمینال را بسته و دوباره باز کنید."
    exit 1
fi

CARGO_VER=$(cargo -v | head -n1)
echo -e "${GREEN}✓ Rust/Cargo یافت شد: $CARGO_VER${NC}"

# ------------------------------------------------------------------------------
# 3. بررسی تارگت کراس کامپایل ویندوز (x86_64-pc-windows-gnu)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/6] بررسی تارگت ویندوز در Rust...${NC}"
if command -v rustup >/dev/null 2>&1; then
    if ! rustup target list --installed | grep -q "x86_64-pc-windows-gnu"; then
        echo -e "${CYAN}در حال اضافه کردن تارگت x86_64-pc-windows-gnu به rustup...${NC}"
        rustup target add x86_64-pc-windows-gnu
    else
        echo -e "${GREEN}✓ تارگت x86_64-pc-windows-gnu فعال است.${NC}"
    fi
else
    echo -e "${YELLOW}توجه: rustup یافت نشد، از پیش‌فرض cargo استفاده می‌شود.${NC}"
fi

# ------------------------------------------------------------------------------
# 4. بررسی ابزار کراس‌کامپایلر MinGW (gcc-mingw-w64) و NSIS
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/6] بررسی لینکر MinGW (x86_64-w64-mingw32-gcc) و NSIS...${NC}"
MISSING_PKGS=0

if ! command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1; then
    echo -e "${RED}[هشدار] کامپایلر و لینکر MinGW ویندوز یافت نشد!${NC}"
    MISSING_PKGS=1
else
    echo -e "${GREEN}✓ لینکر MinGW ویندوز (x86_64-w64-mingw32-gcc) آماده است.${NC}"
fi

if ! command -v makensis >/dev/null 2>&1; then
    echo -e "${YELLOW}[اطلاع] ابزار NSIS (makensis) برای تولید فایل نصبی خودکار Setup.exe یافت نشد.${NC}"
    echo -e "       (در صورت عدم وجود، فقط فایل پرتابل ClinicManagement.exe تولید خواهد شد)${NC}"
else
    echo -e "${GREEN}✓ ابزار NSIS (makensis) آماده است.${NC}"
fi

if [ $MISSING_PKGS -eq 1 ]; then
    echo ""
    echo -e "${CYAN}----------------------------------------------------------------------${NC}"
    echo -e "${YELLOW}برای حل این مورد، بسته MinGW را با توجه به توزیع لینوکس خود نصب کنید:${NC}"
    echo -e "• اوبونتو یا دبیان (Ubuntu / Debian / Mint):"
    echo -e "    ${GREEN}sudo apt-get update && sudo apt-get install -y gcc-mingw-w64-x86-64 nsis${NC}"
    echo -e "• فدورا (Fedora / RHEL):"
    echo -e "    ${GREEN}sudo dnf install -y mingw64-gcc mingw32-nsis${NC}"
    echo -e "• آرچ لینوکس یا مانجارو (Arch / Manjaro):"
    echo -e "    ${GREEN}sudo pacman -S mingw-w64-gcc nsis${NC}"
    echo -e "${CYAN}----------------------------------------------------------------------${NC}"
    echo ""
    read -p "آیا مایلید سعی شود با sudo apt-get بسته‌ها نصب شوند؟ (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo apt-get update && sudo apt-get install -y gcc-mingw-w64-x86-64 nsis || true
    else
        echo "لطفاً ابتدا بسته‌های فوق را نصب نموده و دوباره اسکریپت را اجرا کنید."
        exit 1
    fi
fi

# مطمئن شویم پوشه کانفیگ cargo برای تارگت ویندوز وجود دارد
mkdir -p "$ROOT_DIR/src-tauri/.cargo"
cat << 'EOF' > "$ROOT_DIR/src-tauri/.cargo/config.toml"
[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-gcc-ar"

[build]
EOF

# ------------------------------------------------------------------------------
# 5. ساخت کدهای فرانت‌اند و پکیج مستقل بکند
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/6] آماده‌سازی وابستگی‌ها و بیلد فرانت‌اند + بکند متصل...${NC}"
npm install --legacy-peer-deps

echo -e "${CYAN}بیلد فایل‌های استاتیک فرانت‌اند و باندل کردن سرور اکسپرس/دیتابیس...${NC}"
npm run build:all

echo -e "${GREEN}✓ فرانت‌اند (dist/) و بکند (dist-server/server.cjs) با موفقیت کامپایل شدند.${NC}"

# ------------------------------------------------------------------------------
# 6. ساخت فایل اجرایی ویندوز با Tauri
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[6/6] ساخت نهایی فایل ویندوزی EXE با Tauri (تارگت x86_64-pc-windows-gnu)...${NC}"
echo -e "${CYAN}این مرحله در اجرای اول به علت کامپایل پکیج‌های Rust چند دقیقه زمان می‌برد...${NC}"

# اجرای تائوری بیلد با تارگت ویندوز گنو
npm run tauri:build:win

# ------------------------------------------------------------------------------
# 7. ساخت پوشه خروجی تمیز و ساماندهی فایل‌ها
# ------------------------------------------------------------------------------
OUT_DIR="$ROOT_DIR/desktop-output/windows"
PORTABLE_DIR="$OUT_DIR/ClinicManagement-Portable"

mkdir -p "$PORTABLE_DIR"
mkdir -p "$PORTABLE_DIR/dist-server"

# کپی فایل اجرایی اصلی
if [ -f "$ROOT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/ClinicManagement.exe" ]; then
    cp "$ROOT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/ClinicManagement.exe" "$PORTABLE_DIR/"
fi

# کپی فایل نصبی NSIS در صورت وجود
if [ -d "$ROOT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis" ]; then
    cp "$ROOT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/"*.exe "$OUT_DIR/" 2>/dev/null || true
fi

# کپی ملزومات بکند برای حالت پرتابل
if [ -f "$ROOT_DIR/dist-server/node.exe" ]; then
    cp "$ROOT_DIR/dist-server/node.exe" "$PORTABLE_DIR/"
    cp "$ROOT_DIR/dist-server/node.exe" "$PORTABLE_DIR/dist-server/"
fi
if [ -f "$ROOT_DIR/dist-server/backend-server.exe" ]; then
    cp "$ROOT_DIR/dist-server/backend-server.exe" "$PORTABLE_DIR/"
    cp "$ROOT_DIR/dist-server/backend-server.exe" "$PORTABLE_DIR/dist-server/"
fi
cp "$ROOT_DIR/dist-server/server.cjs" "$PORTABLE_DIR/dist-server/"
cp "$ROOT_DIR/mysql-config.json" "$PORTABLE_DIR/"

# ایجاد اسکریپت راه‌انداز هوشمند ویندوز در کنار فایل پرتابل
cat << 'EOF' > "$PORTABLE_DIR/start-clinic.bat"
@echo off
chcp 65001 >nul
title سامانه مدیریت کلینیک و مطب
cd /d "%~dp0"

:: اجرای پروسه بکند در صورت فعال نبودن پورت ۳۰۰۰
if exist "%~dp0node.exe" (
    netstat -ano | findstr :3000 >nul || start "" /B "%~dp0node.exe" "%~dp0dist-server\server.cjs"
) else if exist "%~dp0dist-server\node.exe" (
    netstat -ano | findstr :3000 >nul || start "" /B "%~dp0dist-server\node.exe" "%~dp0dist-server\server.cjs"
) else if exist "%~dp0backend-server.exe" (
    netstat -ano | findstr :3000 >nul || start "" /B "%~dp0backend-server.exe"
) else if exist "%~dp0dist-server\backend-server.exe" (
    netstat -ano | findstr :3000 >nul || start "" /B "%~dp0dist-server\backend-server.exe"
) else if exist "%~dp0dist-server\server.cjs" (
    where node >nul 2>nul && (netstat -ano | findstr :3000 >nul || start "" /B node "%~dp0dist-server\server.cjs")
)

:: اجرای پنجره دسکتاپ برنامه
start "" "ClinicManagement.exe"
exit
EOF

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}   ✓ ساخت فایل EXE با موفقیت کامل انجام شد!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo ""
echo -e "${CYAN}فایل‌های خروجی در مسیر زیر قرار دارند:${NC}"
echo -e "${YELLOW}$OUT_DIR${NC}"
echo ""
if ls "$OUT_DIR"/*setup*.exe 1> /dev/null 2>&1 || ls "$OUT_DIR"/*Setup*.exe 1> /dev/null 2>&1; then
    echo -e "1) فایل نصبی ویندوز (NSIS Installer):"
    ls -lh "$OUT_DIR"/*[sS]etup*.exe 2>/dev/null || true
    echo ""
fi
echo -e "2) پوشه برنامه پرتابل ویندوز به همراه بکند متصل:"
echo -e "   مسیر: ${GREEN}$PORTABLE_DIR${NC}"
echo -e "   - ClinicManagement.exe (فایل اجرایی دسکتاپ)"
echo -e "   - dist-server/server.cjs (سرور متصل به دیتابیس MySQL)"
echo -e "   - mysql-config.json (تنظیمات اتصال)"
echo -e "   - start-clinic.bat (راه‌انداز یک‌کلیکه ویندوز)"
echo ""
echo -e "${PURPLE}کافیست پوشه فوق را روی سیستم ویندوزی مقصد کپی کرده و اجرا نمایید.${NC}"
