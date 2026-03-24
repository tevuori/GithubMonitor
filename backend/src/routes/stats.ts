import { Router, Request, Response } from 'express';
import { getContributorStats } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

router.get('/contributors/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const stats = await getContributorStats(user.accessToken, owner, repo);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contributor stats' });
  }
});

export default router;
