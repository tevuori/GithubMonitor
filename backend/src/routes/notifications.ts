import { Router, Request, Response } from 'express';
import { 
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationThread
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get all notifications
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const all = req.query.all === 'true';
    const participating = req.query.participating === 'true';
    const page = parseInt(String(req.query.page)) || 1;
    const data = await getNotifications(user.accessToken, all, participating, page);
    res.json(data);
  } catch (err: any) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

// Get a specific notification thread
router.get('/thread/:threadId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { threadId } = req.params;
    const data = await getNotificationThread(user.accessToken, parseInt(threadId));
    res.json(data);
  } catch (err: any) {
    console.error('Notification thread error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notification thread' });
  }
});

// Mark a notification as read
router.patch('/thread/:threadId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { threadId } = req.params;
    await markNotificationAsRead(user.accessToken, parseInt(threadId));
    res.json({ success: true });
  } catch (err: any) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: err.message || 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    await markAllNotificationsAsRead(user.accessToken);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ error: err.message || 'Failed to mark all notifications as read' });
  }
});

export default router;
