import { Router, Request, Response } from 'express';
import { getUserPullRequests, getPullRequest, getPullRequestDiff, getRepoPullRequests } from '../services/github';
import axios from 'axios';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get user's PRs
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const pulls = await getUserPullRequests(user.accessToken);
    res.json(pulls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
});

// Get PRs for a specific repo
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const state = (req.query.state as 'open' | 'closed' | 'all') || 'open';
    
    const pulls = await getRepoPullRequests(user.accessToken, owner, repo, state);
    res.json(pulls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repo pull requests' });
  }
});

// Get single PR with reviews, comments, and files
router.get('/:owner/:repo/:pullNumber', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const pullNumber = parseInt(String(req.params.pullNumber));
    
    if (isNaN(pullNumber)) {
      return res.status(400).json({ error: 'Invalid pull request number' });
    }
    
    const pr = await getPullRequest(user.accessToken, owner, repo, pullNumber);
    res.json(pr);
  } catch (err: any) {
    console.error('Get PR error:', err);
    res.status(500).json({ error: 'Failed to fetch pull request', message: err.message });
  }
});

// Get PR diff
router.get('/:owner/:repo/:pullNumber/diff', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const pullNumber = parseInt(String(req.params.pullNumber));
    
    if (isNaN(pullNumber)) {
      return res.status(400).json({ error: 'Invalid pull request number' });
    }
    
    const diff = await getPullRequestDiff(user.accessToken, owner, repo, pullNumber);
    res.type('text/plain').send(diff);
  } catch (err: any) {
    console.error('Get PR diff error:', err);
    res.status(500).json({ error: 'Failed to fetch diff', message: err.message });
  }
});

// Merge a PR directly from the dashboard
router.post('/:owner/:repo/:pullNumber/merge', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const pullNumber = parseInt(String(req.params.pullNumber));

    if (isNaN(pullNumber)) {
      return res.status(400).json({ error: 'Invalid pull request number' });
    }

    const { merge_method = 'merge', commit_title, commit_message } = req.body;

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
      { merge_method, commit_title, commit_message },
      {
        headers: {
          Authorization: `token ${user.accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    res.json({ merged: true, message: response.data.message, sha: response.data.sha });
  } catch (err: any) {
    console.error('Merge PR error:', err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || 'Failed to merge pull request';
    res.status(status).json({ error: message });
  }
});

export default router;
