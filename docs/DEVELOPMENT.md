# Development Guide

This document provides detailed instructions for developers working on the GitHub Monitor Center.

## Development Workflow

### Prerequisites
- Node.js 18+ and npm
- Git
- GitHub account for OAuth development

### Getting Started

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd github-monitor-center
   ./setup.sh
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub OAuth credentials
   ```

3. **Start Development Servers**
   ```bash
   npm run dev
   ```

### Project Structure Overview

```
frontend/
├── src/
│   ├── components/     # Reusable UI components (Layout, buttons, cards)
│   ├── pages/         # Page components (Dashboard, Repositories, etc.)
│   ├── contexts/      # React contexts (Auth, Theme, etc.)
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API service layer
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── App.tsx        # Main application component
└── vite.config.ts     # Vite configuration with proxy

backend/
├── src/
│   ├── index.ts       # Main server entry point
│   ├── routes/        # Express route handlers
│   ├── controllers/   # Request controllers
│   ├── services/      # Business logic services
│   ├── middleware/    # Express middleware
│   └── utils/         # Utility functions
└── tsconfig.json      # TypeScript configuration
```

## Frontend Development

### Technology Stack
- **React 19**: Latest React version with concurrent features
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool with HMR
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management
- **Zustand**: Client state management
- **React Router**: Navigation and routing

### Key Components

#### Authentication Flow
1. User clicks "Login with GitHub"
2. Redirects to `/auth/github` (backend)
3. GitHub OAuth flow
4. Redirects back to app with session
5. Frontend checks `/auth/me` for user data

#### State Management
- **React Query**: Manages server state (API data, caching, refetching)
- **Zustand**: Manages client state (UI state, preferences)
- **Context**: Global auth state

### Adding a New Page

1. Create page component in `frontend/src/pages/`
   ```typescript
   // frontend/src/pages/NewPage.tsx
   import React from 'react';

   const NewPage: React.FC = () => {
     return (
       <div>
         <h1>New Page</h1>
       </div>
     );
   };

   export default NewPage;
   ```

2. Add route in `frontend/src/App.tsx`
   ```typescript
   <Route path="new-page" element={<NewPage />} />
   ```

3. Add navigation link in `frontend/src/components/Layout.tsx`

### API Integration

Use the `useQuery` and `useMutation` hooks from React Query:

```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const useRepositories = () => {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const response = await axios.get('/api/repos');
      return response.data;
    },
  });
};
```

## Backend Development

### Technology Stack
- **Express**: Web framework
- **TypeScript**: Type-safe JavaScript
- **Passport.js**: Authentication middleware
- **Octokit**: GitHub API client
- **Socket.io**: Real-time communication
- **Express Session**: Session management

### API Design Principles

1. **RESTful Design**: Use HTTP methods appropriately
2. **Error Handling**: Consistent error responses
3. **Validation**: Input validation middleware
4. **Authentication**: Protected routes with passport
5. **Rate Limiting**: GitHub API rate limit awareness

### Adding a New API Endpoint

1. Create route handler in `backend/src/routes/`
   ```typescript
   // backend/src/routes/newRoute.ts
   import { Router } from 'express';

   const router = Router();

   router.get('/', (req, res) => {
     res.json({ message: 'New endpoint' });
   });

   export default router;
   ```

2. Import and use in `backend/src/index.ts`
   ```typescript
   import newRoute from './routes/newRoute';
   
   app.use('/api/new-route', newRoute);
   ```

### GitHub API Integration

Use Octokit with user's access token:

```typescript
import { Octokit } from '@octokit/rest';

const getRepositories = async (accessToken: string) => {
  const octokit = new Octokit({ auth: accessToken });
  const response = await octokit.repos.listForAuthenticatedUser();
  return response.data;
};
```

## Real-time Features

### WebSocket Implementation

1. **Server-side** (`backend/src/index.ts`):
   ```typescript
   io.on('connection', (socket) => {
     socket.on('subscribe:repo', (repoId) => {
       socket.join(`repo:${repoId}`);
     });
   });
   ```

2. **Client-side** (`frontend/src/services/socket.ts`):
   ```typescript
   import { io } from 'socket.io-client';

   const socket = io();

   socket.emit('subscribe:repo', 'repo-id');
   socket.on('repo:update', (data) => {
     // Handle update
   });
   ```

### GitHub Webhooks

1. **Setup Webhook** in GitHub repository settings
2. **Receive Webhook** in backend endpoint
3. **Broadcast Update** via Socket.io

## Testing

### Frontend Testing
- **Unit Tests**: React components with Testing Library
- **Integration Tests**: API interactions
- **E2E Tests**: Playwright or Cypress

### Backend Testing
- **Unit Tests**: Individual functions with Jest
- **Integration Tests**: API endpoints with Supertest
- **Mocking**: GitHub API responses

### Running Tests
```bash
# Frontend tests
cd frontend && npm test

# Backend tests  
cd backend && npm test

# All tests
npm run test
```

## Code Quality

### Linting
- ESLint for JavaScript/TypeScript
- Prettier for code formatting

```bash
# Lint frontend
npm run lint:frontend

# Lint backend
npm run lint:backend

# Fix linting issues
npm run lint:fix
```

### Type Checking
```bash
# Frontend type check
cd frontend && npx tsc --noEmit

# Backend type check
cd backend && npx tsc --noEmit
```

## Deployment

### Production Build
```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

### Environment Configuration
- Set `NODE_ENV=production`
- Configure production database (if used)
- Set up HTTPS
- Configure CORS for production domain

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Troubleshooting

### Common Issues

1. **Authentication Issues**:
   - Check OAuth callback URL matches exactly
   - Verify session secret is set
   - Check browser cookies are enabled

2. **CORS Errors**:
   - Ensure frontend proxy is configured
   - Check CORS origin settings
   - Verify ports match (5173 frontend, 3000 backend)

3. **GitHub API Rate Limiting**:
   - Implement caching
   - Use conditional requests (ETag, Last-Modified)
   - Consider using GitHub's GraphQL API for batching

4. **Socket.io Connection Issues**:
   - Check WebSocket support
   - Verify CORS settings for Socket.io
   - Check firewall/network restrictions

### Debugging Tips

1. **Frontend Debugging**:
   - Use React DevTools
   - Check browser console for errors
   - Monitor network requests

2. **Backend Debugging**:
   - Use console.log for development
   - Implement structured logging
   - Use debugging tools (node-inspector)

3. **API Debugging**:
   - Use tools like Postman or Insomnia
   - Check response headers and status codes
   - Log request/response bodies

## Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization
- Bundle analysis with vite-bundle-analyzer

### Backend
- Response compression
- Request caching with Redis (optional)
- Database query optimization

### GitHub API
- Request batching with GraphQL
- Conditional requests to reduce rate limit usage
- Local caching of static data

## Security Considerations

1. **Authentication**:
   - Use HTTP-only cookies for tokens
   - Implement CSRF protection
   - Set secure session options

2. **API Security**:
   - Input validation and sanitization
   - Rate limiting
   - HTTPS enforcement

3. **GitHub Token Security**:
   - Never expose tokens to frontend
   - Store tokens securely in session
   - Implement token refresh if needed

4. **Environment Variables**:
   - Never commit secrets to git
   - Use .env files for development
   - Use secure secret management in production