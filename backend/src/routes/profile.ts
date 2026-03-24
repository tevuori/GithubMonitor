import { Router, Request, Response } from 'express';
import { 
  getUserProfile,
  getRateLimit,
  getUserEmails,
  getReceivedEvents,
  getUserActivity
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get user profile
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const data = await getUserProfile(user.accessToken);
    res.json(data);
  } catch (err: any) {
    console.error('Profile error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch profile' });
  }
});

// Get rate limit status
router.get('/rate-limit', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const data = await getRateLimit(user.accessToken);
    res.json(data);
  } catch (err: any) {
    console.error('Rate limit error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch rate limit' });
  }
});

// Get user emails
router.get('/emails', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const data = await getUserEmails(user.accessToken);
    res.json(data);
  } catch (err: any) {
    console.error('Emails error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch emails' });
  }
});

// Get received events (activity feed)
router.get('/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const page = parseInt(String(req.query.page)) || 1;
    const data = await getReceivedEvents(user.accessToken, user.username, page);
    res.json(data);
  } catch (err: any) {
    console.error('Events error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch events' });
  }
});

// Get user activity summary
router.get('/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const data = await getUserActivity(user.accessToken, user.username);
    res.json(data);
  } catch (err: any) {
    console.error('Activity error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch activity' });
  }
});

export default router;
