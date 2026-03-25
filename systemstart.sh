#!/bin/bash

cd /home/tevuori/.openclaw/workspace/github-monitor-center

# Start backend
cd backend
nohup npm run dev > /tmp/github-monitor-backend.log 2>&1 &

# Start frontend
cd ../frontend
nohup npm run dev > /tmp/github-monitor-frontend.log 2>&1 &

echo "GitHub Monitor started!"
