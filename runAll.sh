#!/bin/bash

BACKEND_PORT=18457
BACKEND_PID=""
WEBSITE_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null
    wait "$BACKEND_PID" 2>/dev/null
  fi
  if [ -n "$WEBSITE_PID" ]; then
    kill "$WEBSITE_PID" 2>/dev/null
    wait "$WEBSITE_PID" 2>/dev/null
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill anything already on the backend port
EXISTING_PID=$(lsof -ti:"$BACKEND_PORT" 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
  echo "Killing existing process on port $BACKEND_PORT (PID $EXISTING_PID)..."
  kill -9 $EXISTING_PID 2>/dev/null
  sleep 1
fi

# Start Python backend
echo "Starting Python backend on port $BACKEND_PORT..."
cd "$DIR/app/backend"
source .venv/bin/activate
python main.py --port "$BACKEND_PORT" &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  sleep 1
done

# Start website dev server
echo "Starting website on http://localhost:3000..."
cd "$DIR/website"
npm run dev &
WEBSITE_PID=$!

# Start Electron dev server
echo "Starting Electron app..."
cd "$DIR/app/frontend"
npx electron-vite dev

cleanup
