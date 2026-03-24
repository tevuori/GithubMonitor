import { Router, Request, Response } from 'express';
import { getRepoTrafficViews, getRepoTrafficClones, getRepoTrafficReferrers, getRepoTrafficPaths } from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get all traffic data for a repo
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    
    const [views, clones, referrers, paths] = await Promise.all([
      getRepoTrafficViews(user.accessToken, owner, repo).catch(() => ({ count: 0, uniques: 0, views: [] })),
      getRepoTrafficClones(user.accessToken, owner, repo).catch(() => ({ count: 0, uniques: 0, clones: [] })),
      getRepoTrafficReferrers(user.accessToken, owner, repo).catch(() => []),
      getRepoTrafficPaths(user.accessToken, owner, repo).catch(() => []),
    ]);
    
    res.json({ views, clones, referrers, paths });
  } catch (err: any) {
    console.error('Traffic error:', err);
    res.status(500).json({ error: 'Failed to get traffic data', message: err.message });
  }
});

// Get views only
router.get('/:owner/:repo/views', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    
    const views = await getRepoTrafficViews(user.accessToken, owner, repo);
    res.json(views);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get views', message: err.message });
  }
});

// Get clones only
router.get('/:owner/:repo/clones', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    
    const clones = await getRepoTrafficClones(user.accessToken, owner, repo);
    res.json(clones);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get clones', message: err.message });
  }
});

export default router;
