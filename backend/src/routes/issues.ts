import { Router, Request, Response } from 'express';
import { getUserIssues, getIssueDetails, getIssueComments, getRepoIssues } from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const issues = await getUserIssues(user.accessToken);
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Get issues for a specific repo
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const state = String(req.query.state || 'open');
    const issues = await getRepoIssues(user.accessToken, owner, repo, state);
    res.json(issues);
  } catch (err: any) {
    console.error('Repo issues error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch issues' });
  }
});

// Get single issue details
router.get('/:owner/:repo/:number', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, number } = req.params;
    const issue = await getIssueDetails(user.accessToken, owner, repo, parseInt(number));
    res.json(issue);
  } catch (err: any) {
    console.error('Issue details error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch issue details' });
  }
});

// Get issue comments
router.get('/:owner/:repo/:number/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, number } = req.params;
    const comments = await getIssueComments(user.accessToken, owner, repo, parseInt(number));
    res.json(comments);
  } catch (err: any) {
    console.error('Issue comments error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch comments' });
  }
});

export default router;
