#!/bin/bash
# Move to the root directory of the project
cd /home/tevuori/.openclaw/workspace/github-monitor-center

# Start backend (Run in background within the script)
cd backend
npm run dev > /tmp/github-monitor-backend.log 2>&1 &

# Start frontend (Run in foreground so the service stays 'active')
cd ../frontend
npm run dev > /tmp/github-monitor-frontend.log 2>&1
