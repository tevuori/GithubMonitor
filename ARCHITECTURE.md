# GitHub Monitor Center - Architecture

## Project Structure

```
github-monitor-center/
├── frontend/           # React + TypeScript + Vite + Tailwind
├── backend/           # Node.js + Express + TypeScript
├── docs/              # Documentation
├── package.json       # Root package.json with workspace scripts
├── README.md
└── ARCHITECTURE.md
```

## Tech Stack Decisions

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast, modern)
- **Styling**: Tailwind CSS + shadcn/ui (for consistent components)
- **State Management**: Zustand (lightweight, simple) + React Query (for server state)
- **Charts**: Recharts (React-native, flexible)
- **Routing**: React Router v6
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js + Express
- **Language**: TypeScript
- **GitHub API**: Octokit (official GitHub SDK)
- **Authentication**: Passport.js with GitHub OAuth strategy
- **Database**: PostgreSQL (optional for caching, user preferences)
- **Real-time**: Socket.io for WebSocket connections
- **API Documentation**: Swagger/OpenAPI

### Development
- **Package Manager**: npm (or pnpm/yarn)
- **Linting**: ESLint + Prettier
- **Testing**: Vitest (frontend), Jest (backend)
- **Environment**: dotenv for configuration

## Feature Implementation Plan

### Phase 1: Foundation
1. Project setup with TypeScript
2. Basic Express server with API routes
3. React frontend with routing
4. GitHub OAuth integration
5. Basic UI layout with shadcn components

### Phase 2: Core Features
1. Repository listing and filtering
2. Commit history visualization
3. Pull request dashboard
4. Issues tracker
5. Branch monitoring

### Phase 3: Advanced Features
1. Real-time updates via WebSockets
2. GitHub webhook integration
3. Advanced charts and analytics
4. User preferences and dashboards
5. Performance optimizations

## API Design

### Authentication Routes
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - OAuth callback
- `GET /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Repository Routes
- `GET /api/repos` - List all repositories
- `GET /api/repos/:owner/:repo` - Get repository details
- `GET /api/repos/:owner/:repo/commits` - Get commit history
- `GET /api/repos/:owner/:repo/pulls` - Get pull requests
- `GET /api/repos/:owner/:repo/issues` - Get issues
- `GET /api/repos/:owner/:repo/branches` - Get branches
- `GET /api/repos/:owner/:repo/workflows` - Get workflow runs

## Data Flow

1. User authenticates via GitHub OAuth
2. Frontend stores access token (securely)
3. API requests go through backend proxy (to avoid CORS and protect tokens)
4. Backend uses Octokit with user's access token
5. Data is transformed and cached as needed
6. Real-time updates via GitHub webhooks → Socket.io → Frontend

## Security Considerations

- GitHub tokens stored in HTTP-only cookies
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configured appropriately
- Environment variables for secrets
- Regular dependency updates