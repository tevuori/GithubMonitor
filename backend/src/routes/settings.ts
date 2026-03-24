import { Router, Request, Response } from 'express';
import { 
  getRepoSettings,
  getBranchProtection,
  updateBranchProtection,
  getCollaborators,
  getRepoWebhooks,
  getRepoTopics,
  updateRepoTopics
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get repository settings
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getRepoSettings(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Repo settings error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch repo settings' });
  }
});

// Get branch protection rules
router.get('/:owner/:repo/branches/:branch/protection', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, branch } = req.params;
    const data = await getBranchProtection(user.accessToken, owner, repo, branch);
    res.json(data);
  } catch (err: any) {
    if (err.status === 404) {
      return res.json({ protected: false });
    }
    console.error('Branch protection error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch branch protection' });
  }
});

// Update branch protection
router.put('/:owner/:repo/branches/:branch/protection', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, branch } = req.params;
    const data = await updateBranchProtection(user.accessToken, owner, repo, branch, req.body);
    res.json(data);
  } catch (err: any) {
    console.error('Update branch protection error:', err);
    res.status(500).json({ error: err.message || 'Failed to update branch protection' });
  }
});

// Get collaborators
router.get('/:owner/:repo/collaborators', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getCollaborators(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Collaborators error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch collaborators' });
  }
});

// Get webhooks
router.get('/:owner/:repo/hooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getRepoWebhooks(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    if (err.status === 404) {
      return res.json([]);
    }
    console.error('Webhooks error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch webhooks' });
  }
});

// Get topics
router.get('/:owner/:repo/topics', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getRepoTopics(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Topics error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch topics' });
  }
});

// Update topics
router.put('/:owner/:repo/topics', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const { names } = req.body;
    const data = await updateRepoTopics(user.accessToken, owner, repo, names);
    res.json(data);
  } catch (err: any) {
    console.error('Update topics error:', err);
    res.status(500).json({ error: err.message || 'Failed to update topics' });
  }
});

export default router;
