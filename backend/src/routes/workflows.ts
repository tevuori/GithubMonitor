import { Router, Request, Response } from 'express';
import { getRepoWorkflowRuns } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const runs = await getRepoWorkflowRuns(user.accessToken, owner, repo);
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflow runs' });
  }
});

export default router;
