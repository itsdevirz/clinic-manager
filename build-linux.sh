#!/bin/bash
# Convenient root launcher for desktop-builder/build-linux.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/desktop-builder/build-linux.sh" "$@"
