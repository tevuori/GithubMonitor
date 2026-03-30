import { Router, Request, Response } from 'express';
import {
  getRepoBranches,
  getGitGraph,
  deleteBranch,
  getDefaultBranch,
  createBranchFromCommit,
  createTagFromCommit,
  renameBranch,
  setDefaultBranch,
  squashMergeBranch,
  rebaseMergeBranch,
} from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Validate branch name helper
function isValidBranchName(name: string): boolean {
  if (!name || typeof name !== 'string' || name.trim() === '') return false;
  if (name.includes(' ') || name.includes('~') || name.includes('^') || name.includes('..') || name.endsWith('/')) return false;
  return true;
}

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

    if (!isValidBranchName(name)) {
      return res.status(400).json({ error: 'Branch name contains invalid characters' });
    }

    const data = await createBranchFromCommit(user.accessToken, owner, repo, name, fromSha);
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Create branch error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create branch' });
  }
});

// Rename a branch
router.post('/:owner/:repo/:branch/rename', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const oldName = String(req.params.branch);
    const { newName } = req.body as { newName?: string };

    if (!newName) {
      return res.status(400).json({ error: 'newName is required' });
    }

    if (!isValidBranchName(newName)) {
      return res.status(400).json({ error: 'New branch name contains invalid characters' });
    }

    if (oldName === newName) {
      return res.status(400).json({ error: 'New name must differ from current name' });
    }

    // Prevent renaming the default branch (safety guard)
    const defaultBranch = await getDefaultBranch(user.accessToken, owner, repo);
    if (oldName === defaultBranch) {
      return res.status(400).json({ error: 'Cannot rename the default branch via this endpoint. Change the default branch first.' });
    }

    const result = await renameBranch(user.accessToken, owner, repo, oldName, newName);
    res.json(result);
  } catch (err: any) {
    console.error('Rename branch error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to rename branch' });
  }
});

// Set default branch
router.patch('/:owner/:repo/default', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const { branch } = req.body as { branch?: string };

    if (!branch) {
      return res.status(400).json({ error: 'branch is required' });
    }

    const result = await setDefaultBranch(user.accessToken, owner, repo, branch);
    res.json(result);
  } catch (err: any) {
    console.error('Set default branch error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to set default branch' });
  }
});

// Squash-merge a branch into a target branch
router.post('/:owner/:repo/squash-merge', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const { head, base, commitTitle, commitMessage } = req.body as {
      head?: string;
      base?: string;
      commitTitle?: string;
      commitMessage?: string;
    };

    if (!head || !base) {
      return res.status(400).json({ error: 'head and base branch names are required' });
    }

    if (head === base) {
      return res.status(400).json({ error: 'head and base must be different branches' });
    }

    const result = await squashMergeBranch(user.accessToken, owner, repo, head, base, commitTitle, commitMessage);
    res.json(result);
  } catch (err: any) {
    console.error('Squash merge error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to squash merge branch' });
  }
});

// Rebase-merge a branch into a target branch
router.post('/:owner/:repo/rebase-merge', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const { head, base } = req.body as { head?: string; base?: string };

    if (!head || !base) {
      return res.status(400).json({ error: 'head and base branch names are required' });
    }

    if (head === base) {
      return res.status(400).json({ error: 'head and base must be different branches' });
    }

    const result = await rebaseMergeBranch(user.accessToken, owner, repo, head, base);
    res.json(result);
  } catch (err: any) {
    console.error('Rebase merge error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to rebase merge branch' });
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

    if (!isValidBranchName(name)) {
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
