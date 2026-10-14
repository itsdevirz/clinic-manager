# Clinic Management Desktop Builder (Tauri v2)

This folder contains all automated build scripts and guides for packaging the clinic management web app into an ultra-fast, lightweight Windows `.exe` desktop application using Tauri.

## Files in this directory:
- `build-exe.bat`: One-click Windows batch script to compile and generate the `.exe` installer.
- `run-dev-mode.bat`: Runs the app inside the native Windows desktop shell with live-reload.
- `install-rust-prerequisites.bat`: Helper to install Rust & build tools on Windows.
- `راهنمای_جامع_ساخت_فایل_EXE.md`: Comprehensive step-by-step guide in Persian.

## Core Tauri Source Directory:
All native Rust configurations, manifests, capabilities and icons are located at `/src-tauri`.
- `src-tauri/tauri.conf.json`: Window dimensions, app identity, permissions, and bundle target settings.
- `src-tauri/Cargo.toml`: Rust dependencies and metadata.
- `src-tauri/icons/`: App icons for executable, window titlebar, and installer.
