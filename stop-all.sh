#!/bin/bash

echo "Stopping all bus-schedule services..."

pkill -f uvicorn
pkill -f vite
pkill -f cloudflared
pkill -f "npm run dev"

echo "All services stopped."
