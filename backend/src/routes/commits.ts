import { Router, Request, Response } from 'express';
import { getRepoCommits, getCommitDetails } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const commits = await getRepoCommits(user.accessToken, owner, repo);
    res.json(commits);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commits' });
  }
});

// Get single commit with diff
router.get('/:owner/:repo/:sha', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, sha } = req.params;
    const commit = await getCommitDetails(user.accessToken, owner, repo, sha);
    res.json(commit);
  } catch (err: any) {
    console.error('Commit details error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch commit details' });
  }
});

export default router;
