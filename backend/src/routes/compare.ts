import { Router, Request, Response } from 'express';
import { compareBranches, compareCommits } from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Compare two branches
router.get('/:owner/:repo/branches', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const base = String(req.query.base);
    const head = String(req.query.head);
    
    if (!base || !head) {
      return res.status(400).json({ error: 'base and head query params required' });
    }
    
    const data = await compareBranches(user.accessToken, owner, repo, base, head);
    res.json(data);
  } catch (err: any) {
    console.error('Compare branches error:', err);
    res.status(500).json({ error: err.message || 'Failed to compare branches' });
  }
});

// Compare two commits
router.get('/:owner/:repo/commits', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const base = String(req.query.base);
    const head = String(req.query.head);
    
    if (!base || !head) {
      return res.status(400).json({ error: 'base and head query params required' });
    }
    
    const data = await compareCommits(user.accessToken, owner, repo, base, head);
    res.json(data);
  } catch (err: any) {
    console.error('Compare commits error:', err);
    res.status(500).json({ error: err.message || 'Failed to compare commits' });
  }
});

export default router;
