import { Router, Request, Response } from 'express';
import { getUserPullRequests } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const pulls = await getUserPullRequests(user.accessToken);
    res.json(pulls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
});

export default router;
