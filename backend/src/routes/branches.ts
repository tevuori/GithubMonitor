import { Router, Request, Response } from 'express';
import { getRepoBranches, getGitGraph, deleteBranch, getDefaultBranch, createBranchFromCommit, createTagFromCommit } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// List all branches for a repo
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const [branches, defaultBranch] = await Promise.all([
      getRepoBranches(user.accessToken, owner, repo),
      getDefaultBranch(user.accessToken, owner, repo),
    ]);
    res.json({ branches, defaultBranch });
  } catch { res.status(500).json({ error: 'Failed to fetch branches' }); }
});

// Create a new branch from an arbitrary commit SHA
router.post('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const { name, fromSha } = req.body as { name?: string; fromSha?: string };

    if (!name || !fromSha) {
      return res.status(400).json({ error: 'name and fromSha are required' });
    }

    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Branch name must be a non-empty string' });
    }

    // Basic guard against obviously invalid names
    if (name.includes(' ') || name.includes('~') || name.includes('^') || name.includes('..') || name.endsWith('/')) {
      return res.status(400).json({ error: 'Branch name contains invalid characters' });
    }

    const data = await createBranchFromCommit(user.accessToken, owner, repo, name, fromSha);
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Create branch error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create branch' });
  }
});

// Create a lightweight tag for a commit
router.post('/:owner/:repo/tag', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const { name, fromSha } = req.body as { name?: string; fromSha?: string };

    if (!name || !fromSha) {
      return res.status(400).json({ error: 'name and fromSha are required' });
    }

    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Tag name must be a non-empty string' });
    }

    if (name.includes(' ') || name.includes('~') || name.includes('^') || name.includes('..') || name.endsWith('/')) {
      return res.status(400).json({ error: 'Tag name contains invalid characters' });
    }

    const data = await createTagFromCommit(user.accessToken, owner, repo, name, fromSha);
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Create tag error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create tag' });
  }
});

// Git graph for a repo
router.get('/:owner/:repo/graph', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const perPage = parseInt(String(req.query.perPage)) || 100;
    res.json(await getGitGraph(user.accessToken, owner, repo, perPage));
  } catch (err) {
    console.error('Git graph error:', err);
    res.status(500).json({ error: 'Failed to fetch git graph' });
  }
});

// Delete a branch
// Safety: the route itself does not prevent deletion of the default branch;
// the frontend enforces that guard, but we double-check here too.
router.delete('/:owner/:repo/:branch', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const branch = String(req.params.branch);

    // Safety guard: refuse to delete the default branch
    const defaultBranch = await getDefaultBranch(user.accessToken, owner, repo);
    if (branch === defaultBranch) {
      return res.status(400).json({ error: `Cannot delete the default branch (${defaultBranch})` });
    }

    await deleteBranch(user.accessToken, owner, repo, branch);
    res.json({ success: true, deleted: branch });
  } catch (err: any) {
    console.error('Delete branch error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to delete branch' });
  }
});

export default router;
