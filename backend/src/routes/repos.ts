import { Router, Request, Response } from 'express';
import { getUserRepos, getRepoStats } from '../services/github';

const router = Router();

// Auth guard middleware
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// GET /api/repos
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const repos = await getUserRepos(user.accessToken);
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// GET /api/repos/:owner/:repo/stats
router.get('/:owner/:repo/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const stats = await getRepoStats(user.accessToken, owner, repo);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repo stats' });
  }
});

export default router;
