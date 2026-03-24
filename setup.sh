#!/bin/bash

echo "Setting up GitHub Monitor Center..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files
echo "Creating environment files..."
cp .env.example .env
echo "Please update .env with your GitHub OAuth credentials"

# Create gitignore if not exists
if [ ! -f .gitignore ]; then
  cat > .gitignore << EOF
# Dependencies
node_modules/
backend/node_modules/
frontend/node_modules/

# Build outputs
dist/
backend/dist/
frontend/dist/
frontend/.vite/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temp files
*.tmp
*.temp
EOF
fi

echo ""
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "1. Update .env with your GitHub OAuth credentials"
echo "2. Run: npm run dev"
echo ""
echo "GitHub OAuth setup instructions:"
echo "1. Go to https://github.com/settings/developers"
echo "2. Create a new OAuth App"
echo "3. Set Homepage URL: http://localhost:5173"
echo "4. Set Authorization callback URL: http://localhost:3000/auth/github/callback"
echo "5. Copy Client ID and Client Secret to .env file"