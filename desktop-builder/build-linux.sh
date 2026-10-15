#!/bin/bash
# Build the Windows Tauri application and bundle its private Node.js backend runtime.

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

NODE_RUNTIME_VERSION="${NODE_RUNTIME_VERSION:-22.14.0}"
NODE_RUNTIME_DIR="$ROOT_DIR/build/node-win"
NODE_RUNTIME_ZIP="$NODE_RUNTIME_DIR/node-v${NODE_RUNTIME_VERSION}-win-x64.zip"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${PURPLE}   سامانه مدیریت مطب و کلینیک - ساخت خروجی ویندوز همراه بک‌اند${NC}"
echo -e "${CYAN}======================================================================${NC}"

echo -e "${YELLOW}[1/6] بررسی Node.js، npm و Rust... ${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js برای ساخت برنامه لازم است.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm پیدا نشد.${NC}"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo -e "${RED}Cargo/Rust پیدا نشد.${NC}"; exit 1; }
echo -e "${GREEN}✓ Node $(node -v) و Cargo آماده‌اند.${NC}"

echo -e "${YELLOW}[2/6] آماده‌سازی ابزارهای ساخت ویندوز... ${NC}"
if ! command -v rustup >/dev/null 2>&1; then
  echo -e "${RED}rustup لازم است تا تارگت ویندوز نصب شود.${NC}"
  exit 1
fi
rustup target list --installed | grep -q '^x86_64-pc-windows-gnu$' || rustup target add x86_64-pc-windows-gnu

if ! command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1; then
  echo -e "${RED}MinGW پیدا نشد. در Ubuntu/Debian اجرا کن: sudo apt-get update && sudo apt-get install -y gcc-mingw-w64-x86-64 nsis unzip curl${NC}"
  exit 1
fi
command -v curl >/dev/null 2>&1 || { echo -e "${RED}curl پیدا نشد.${NC}"; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo -e "${RED}unzip پیدا نشد.${NC}"; exit 1; }

mkdir -p "$ROOT_DIR/src-tauri/.cargo"
cat > "$ROOT_DIR/src-tauri/.cargo/config.toml" <<'EOF'
[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-gcc-ar"

[build]
EOF

echo -e "${YELLOW}[3/6] دریافت Node.js ویندوزی برای اجرای مخفی بک‌اند... ${NC}"
mkdir -p "$NODE_RUNTIME_DIR"
if [ ! -s "$NODE_RUNTIME_DIR/node.exe" ]; then
  curl --fail --location --retry 3 \
    "https://nodejs.org/dist/v${NODE_RUNTIME_VERSION}/node-v${NODE_RUNTIME_VERSION}-win-x64.zip" \
    --output "$NODE_RUNTIME_ZIP"
  unzip -p "$NODE_RUNTIME_ZIP" "node-v${NODE_RUNTIME_VERSION}-win-x64/node.exe" > "$NODE_RUNTIME_DIR/node.exe"
fi
if [ ! -s "$NODE_RUNTIME_DIR/node.exe" ]; then
  echo -e "${RED}دانلود یا استخراج node.exe ویندوزی ناموفق بود.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js ویندوزی برای قرارگیری داخل بسته آماده است.${NC}"

echo -e "${YELLOW}[4/6] نصب وابستگی‌ها و ساخت فرانت‌اند و بک‌اند... ${NC}"
npm install --legacy-peer-deps
npm run build:all

if [ ! -s "$ROOT_DIR/dist-server/server.cjs" ]; then
  echo -e "${RED}فایل dist-server/server.cjs ساخته نشد؛ ساخت متوقف شد.${NC}"
  exit 1
fi
if [ ! -s "$ROOT_DIR/mongo-config.json" ]; then
  echo -e "${RED}فایل mongo-config.json پیدا نشد.${NC}"
  exit 1
fi

echo -e "${YELLOW}[5/6] ساخت برنامه Tauri برای ویندوز... ${NC}"
npm run tauri:build:win

echo -e "${YELLOW}[6/6] مرتب‌سازی خروجی‌ها... ${NC}"
OUT_DIR="$ROOT_DIR/desktop-output/windows"
PORTABLE_DIR="$OUT_DIR/ClinicManagement-Portable"
TARGET_EXE="$ROOT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/ClinicManagement.exe"
mkdir -p "$PORTABLE_DIR"

if [ ! -s "$TARGET_EXE" ]; then
  echo -e "${RED}فایل ClinicManagement.exe ساخته نشد.${NC}"
  exit 1
fi
cp "$TARGET_EXE" "$PORTABLE_DIR/"
cp "$TARGET_EXE" "$OUT_DIR/"

NSIS_DIR="$ROOT_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis"
if [ -d "$NSIS_DIR" ]; then
  find "$NSIS_DIR" -maxdepth 1 -type f -iname '*.exe' -exec cp -f {} "$OUT_DIR/" \;
fi

echo
echo -e "${GREEN}✓ ساخت انجام شد. Node.js و بک‌اند داخل بسته قرار گرفته‌اند.${NC}"
echo -e "خروجی: ${YELLOW}$OUT_DIR${NC}"
echo -e "Portable: ${GREEN}$PORTABLE_DIR/ClinicManagement.exe${NC}"
echo -e "${PURPLE}کاربر نهایی برای اجرای بک‌اند نیازی به نصب Node.js یا اجرای دستی سرور ندارد.${NC}"
