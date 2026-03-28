import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import repoRoutes from './routes/repos';
import commitRoutes from './routes/commits';
import branchRoutes from './routes/branches';
import issueRoutes from './routes/issues';
import pullRoutes from './routes/pulls';
import workflowRoutes from './routes/workflows';
import statsRoutes from './routes/stats';
import searchRoutes from './routes/search';
import filesRoutes from './routes/files';
import trafficRoutes from './routes/traffic';
import orgsRoutes from './routes/orgs';
import compareRoutes from './routes/compare';
import releasesRoutes from './routes/releases';
import insightsRoutes from './routes/insights';
import securityRoutes from './routes/security';
import notificationsRoutes from './routes/notifications';
import settingsRoutes from './routes/settings';
import dependenciesRoutes from './routes/dependencies';
import milestonesRoutes from './routes/milestones';
import profileRoutes from './routes/profile';
import reportsRoutes from './routes/reports';
import envRoutes from './routes/env';
import backupRoutes from './routes/backup';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend .env or root .env
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8001;

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
      }
      const allowedOrigin = process.env.CORS_ORIGIN;
      if (allowedOrigin && origin === allowedOrigin) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    const allowedOrigin = process.env.CORS_ORIGIN;
    if (allowedOrigin && origin === allowedOrigin) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`CORS: Allowing origin ${origin} in development mode`);
      return callback(null, true);
    }
    console.error(`CORS: Blocked origin ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || '1fa34c482e28fd518f9f71ed55d405f0f1371c81161811172076e3507a948d32',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE || '86400000'),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

/**
 * Registers (or re-registers) the GitHub OAuth strategy with the current
 * environment variables. Safe to call at startup (no-op if credentials are
 * missing) and again after credentials are saved via /api/env/setup.
 */
export function configurePassport(): boolean {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.log('GitHub OAuth credentials not set — skipping passport strategy registration.');
    return false;
  }

  // Unregister existing strategy if already registered to avoid duplicate errors
  try { (passport as any)._strategies && delete (passport as any)._strategies['github']; } catch (_) {}

  passport.use(new GitHubStrategy({
    clientID,
    clientSecret,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
    scope: ['user:email', 'read:org', 'repo']
  }, (accessToken: string, _refreshToken: string, profile: any, done: any) => {
    profile.accessToken = accessToken;
    return done(null, profile);
  }));

  console.log('GitHub OAuth strategy registered successfully.');
  return true;
}

// Attempt to register at startup — no-op if credentials are absent
configurePassport();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  socket.on('subscribe:repo', (repoId: string) => {
    socket.join(`repo:${repoId}`);
    console.log(`Client ${socket.id} subscribed to repo ${repoId}`);
  });
  socket.on('unsubscribe:repo', (repoId: string) => {
    socket.leave(`repo:${repoId}`);
    console.log(`Client ${socket.id} unsubscribed from repo ${repoId}`);
  });
});

// Routes
app.get('/', (_req, res) => {
  res.json({
    name: 'GitHub Monitor Center API',
    version: '0.1.0',
    status: 'running'
  });
});

// Env management routes (must be before auth so setup works without credentials)
app.use('/api/env', envRoutes);

// Auth routes
app.get('/auth/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'GitHub OAuth is not configured yet. Please provide your credentials via the setup page.'
    });
  }
  passport.authenticate('github')(req, res, next);
});

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (_req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  }
);

app.get('/auth/logout', (_req, res) => {
  _req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    return res.json({ message: 'Logged out successfully' });
  });
});

app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    const { accessToken, ...safeUser } = user;
    res.json(safeUser);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// API routes
app.use('/api/repos', repoRoutes);
app.use('/api/commits', commitRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/pulls', pullRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/orgs', orgsRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/releases', releasesRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dependencies', dependenciesRoutes);
app.use('/api/milestones', milestonesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/backup', backupRoutes);

// Start server
httpServer.listen(PORT, () => {
  console.log(`GitHub Monitor Center API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  console.log(`Frontend URL (OAuth redirect): ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`GitHub Callback URL: ${process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'}`);
});
