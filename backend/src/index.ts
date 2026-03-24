import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

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
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
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
}, (accessToken: string, refreshToken: string, profile: any, done: any) => {
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
app.get('/', (req, res) => {
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
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
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
app.get('/api/repos', (req, res) => {
  res.json({ message: 'Repository list endpoint' });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`GitHub Monitor Center API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});