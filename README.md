# GitHub Monitor Center

A real-time dashboard for monitoring GitHub activity across repositories and organizations.

## 🚀 Features

- **Repository Overview**: List and filter repositories with detailed metrics
- **Commit Analytics**: Visualize commit history with heatmaps and charts
- **Pull Request Dashboard**: Track PR status, reviews, and merge rates
- **Issue Tracker**: Monitor issues with burndown charts and resolution stats
- **Branch Monitor**: Identify stale branches and protection status
- **CI/CD Status**: View GitHub Actions workflow runs in real-time
- **Real-time Updates**: Live updates via WebSockets and GitHub webhooks
- **GitHub OAuth**: Secure authentication with GitHub accounts

## 🛠️ Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for fast builds and development
- Tailwind CSS for styling
- Recharts for data visualization
- Zustand + React Query for state management
- React Router for navigation
- Socket.io-client for real-time updates

### Backend
- Node.js + Express with TypeScript
- Octokit for GitHub API integration
- Passport.js with GitHub OAuth
- Socket.io for WebSocket server
- Express Session for authentication

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- GitHub account for OAuth setup

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd github-monitor-center

# Run setup script
./setup.sh

# Or manually:
# 1. Install dependencies
npm run setup

# 2. Configure environment
cp .env.example .env
# Edit .env with your GitHub OAuth credentials (see below)

# 3. Start development servers
npm run dev
```

### GitHub OAuth Setup

1. **Create GitHub OAuth App**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in the following:
     - **Application name**: GitHub Monitor Center (or your preferred name)
     - **Homepage URL**: `http://localhost:5173`
     - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`

2. **Get Credentials**:
   - After creating the app, you'll get a **Client ID** and **Client Secret**
   - Click "Generate a new client secret" if needed

3. **Update Environment**:
   - Copy `.env.example` to `.env`
   - Add your credentials:
     ```
     GITHUB_CLIENT_ID=your_client_id_here
     GITHUB_CLIENT_SECRET=your_client_secret_here
     SESSION_SECRET=your_session_secret_here
     ```

## 📁 Project Structure

```
github-monitor-center/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   └── App.tsx         # Main app component
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                # Express backend API
│   ├── src/
│   │   └── index.ts       # Main server file
│   ├── package.json       # Backend dependencies
│   └── tsconfig.json      # TypeScript configuration
├── docs/                   # Documentation
├── package.json           # Root scripts and dependencies
├── README.md              # This file
├── ARCHITECTURE.md        # Detailed architecture
├── .env.example           # Environment template
└── setup.sh               # Setup script
```

## 🧪 Development

```bash
# Start both frontend and backend with colored output
npm run dev

# Start only frontend (http://localhost:5173)
npm run dev:frontend

# Start only backend (http://localhost:3000)
npm run dev:backend

# Build for production
npm run build

# Run linters
npm run lint

# Run tests
npm run test
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | (required) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | (required) |
| `SESSION_SECRET` | Express session secret | (required) |
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `SESSION_COOKIE_MAX_AGE` | Session cookie lifetime | `86400000` (24h) |

## 🌐 API Endpoints

### Authentication
- `GET /auth/github` - Initiate GitHub OAuth login
- `GET /auth/github/callback` - OAuth callback handler
- `GET /auth/logout` - Logout user
- `GET /auth/me` - Get current user info

### API Routes (Planned)
- `GET /api/repos` - List repositories
- `GET /api/repos/:owner/:repo/commits` - Get commit history
- `GET /api/repos/:owner/:repo/pulls` - Get pull requests
- `GET /api/repos/:owner/:repo/issues` - Get issues
- `GET /api/repos/:owner/:repo/branches` - Get branches
- `GET /api/repos/:owner/:repo/workflows` - Get workflow runs

## 📊 Features Roadmap

### Phase 1 (Current) - Foundation
- ✅ Project setup with TypeScript
- ✅ Basic Express server with API routes
- ✅ React frontend with routing
- ✅ GitHub OAuth integration
- ✅ Basic UI layout

### Phase 2 - Core Features
- Repository listing and filtering
- Commit history visualization
- Pull request dashboard
- Issues tracker
- Branch monitoring

### Phase 3 - Advanced Features
- Real-time updates via WebSockets
- GitHub webhook integration
- Advanced charts and analytics
- User preferences and dashboards
- Performance optimizations

## 🐛 Troubleshooting

### Common Issues

1. **OAuth Not Working**:
   - Ensure callback URL matches exactly: `http://localhost:3000/auth/github/callback`
   - Check that credentials are correctly set in `.env`
   - Verify GitHub OAuth app has correct permissions

2. **Frontend Can't Connect to Backend**:
   - Ensure both servers are running (`npm run dev`)
   - Check that backend is on port 3000
   - Verify proxy configuration in `frontend/vite.config.ts`

3. **TypeScript Errors**:
   - Run `npm run build` to check for type errors
   - Ensure all dependencies are installed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [GitHub REST API](https://docs.github.com/en/rest)
- [Octokit](https://github.com/octokit) - GitHub SDK
- [React](https://reactjs.org/) - UI library
- [Express](https://expressjs.com/) - Backend framework

---

**Happy Monitoring!** 🎯
