import { Router, Request, Response } from 'express';
import { getRepoBranches, getGitGraph } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    res.json(await getRepoBranches(user.accessToken, owner, repo));
  } catch { res.status(500).json({ error: 'Failed to fetch branches' }); }
});

router.get('/:owner/:repo/graph', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const perPage = parseInt(req.query.perPage as string) || 100;
    res.json(await getGitGraph(user.accessToken, owner, repo, perPage));
  } catch (err) {
    console.error('Git graph error:', err);
    res.status(500).json({ error: 'Failed to fetch git graph' });
  }
});

export default router;
