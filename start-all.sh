#!/bin/bash

cd ~/bus-schedule

# Start backend
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

# Start frontend
cd frontend
nohup npm run dev -- --host > ../frontend.log 2>&1 &

# Start backend tunnel
nohup cloudflared tunnel --url http://localhost:8000 > ../backend-tunnel.log 2>&1 &

# Start frontend tunnel
nohup cloudflared tunnel --url http://localhost:5173 > ../frontend-tunnel.log 2>&1 &

sleep 10

echo "===== BACKEND TUNNEL URL ====="
grep -o 'https://[a-z-]*\.trycloudflare\.com' ../backend-tunnel.log | head -1

echo "===== FRONTEND TUNNEL URL ====="
grep -o 'https://[a-z-]*\.trycloudflare\.com' ../frontend-tunnel.log | head -1

echo ""
echo "Update src/api.js with the BACKEND URL, then open the FRONTEND URL on your phone."
