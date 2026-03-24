import { Router, Request, Response } from 'express';
import { getUserIssues } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const issues = await getUserIssues(user.accessToken);
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

export default router;
