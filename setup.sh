#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Installing Dedupify ==="
echo ""

# Check prerequisites
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is not installed. Install it from https://nodejs.org"
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "Error: Python 3 is not installed. Install it from https://python.org"
  exit 1
fi

# Frontend
echo "[1/3] Installing frontend dependencies..."
cd "$DIR/app/frontend"
npm install

# Backend
echo "[2/3] Setting up Python backend..."
cd "$DIR/app/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt --quiet

# Website
echo "[3/3] Installing website dependencies..."
cd "$DIR/website"
npm install

echo ""
echo "=== Done! ==="
echo "Run ./runAll.sh to start the app."
