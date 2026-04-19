#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Building Dedupify ==="
echo ""

# Step 1: Freeze the Python backend with PyInstaller
echo "[1/3] Building Python backend..."
cd "$DIR/app/backend"
source .venv/bin/activate
pip install pyinstaller -q
pyinstaller dedupify-backend.spec --clean --noconfirm
deactivate
echo "Backend binary: $(ls -lh dist/dedupify-backend | awk '{print $5}')"
echo ""

# Step 2: Build the Electron frontend
echo "[2/3] Building Electron frontend..."
cd "$DIR/app/frontend"
npx electron-vite build
echo ""

# Step 3: Package as .dmg
echo "[3/3] Packaging .dmg..."
unset ELECTRON_RUN_AS_NODE
npx electron-builder --mac
echo ""

echo "=== Build complete! ==="
echo "Output: $(ls "$DIR/app/frontend/dist/"*.dmg 2>/dev/null)"
