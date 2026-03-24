import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import repoRoutes from './routes/repos';
import commitRoutes from './routes/commits';
import branchRoutes from './routes/branches';
import issueRoutes from './routes/issues';
import pullRoutes from './routes/pulls';
import workflowRoutes from './routes/workflows';


// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all localhost origins in development
      if (process.env.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
      }
      
      // In production, use configured origin
      const allowedOrigin = process.env.CORS_ORIGIN;
      if (allowedOrigin && origin === allowedOrigin) {
        return callback(null, true);
      }
      
      // Origin not allowed
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins in development
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
    }
    
    // In production, use configured origin
    const allowedOrigin = process.env.CORS_ORIGIN;
    if (allowedOrigin && origin === allowedOrigin) {
      return callback(null, true);
    }
    
    // Origin not allowed
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

// Passport GitHub OAuth configuration
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
  scope: ['user:email', 'read:org', 'repo']
}, (accessToken: string, _refreshToken: string, profile: any, done: any) => {
  // Store the access token with the user profile
  profile.accessToken = accessToken;
  return done(null, profile);
}));

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

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

// Auth routes
app.get('/auth/github', passport.authenticate('github'));

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
    // Don't send the access token to the client
    const { accessToken, ...safeUser } = user;
    res.json(safeUser);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// API routes placeholder
app.use('/api/repos', repoRoutes);
app.use('/api/commits', commitRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/pulls', pullRoutes);
app.use('/api/workflows', workflowRoutes);


// Start server
httpServer.listen(PORT, () => {
  console.log(`GitHub Monitor Center API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});