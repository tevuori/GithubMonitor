import { Router, Request, Response } from 'express';
import {
  getUserIssues,
  getIssueDetails,
  getIssueComments,
  getRepoIssues,
  createIssue,
  updateIssue,
} from '../services/github';

const router = Router();
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get all issues for the authenticated user
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
// Query param: state=open|closed|all (default: open)
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

// Create a new issue
router.post('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const { title, body, labels, assignees, milestone } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const issue = await createIssue(user.accessToken, owner, repo, { title, body, labels, assignees, milestone });
    res.status(201).json(issue);
  } catch (err: any) {
    console.error('Create issue error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create issue' });
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

// Update an existing issue (title, body, state, labels, assignees, milestone)
router.patch('/:owner/:repo/:number', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, number } = req.params;
    const { title, body, state, state_reason, labels, assignees, milestone } = req.body;
    const issue = await updateIssue(user.accessToken, owner, repo, parseInt(number), {
      title,
      body,
      state,
      state_reason,
      labels,
      assignees,
      milestone,
    });
    res.json(issue);
  } catch (err: any) {
    console.error('Update issue error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to update issue' });
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
