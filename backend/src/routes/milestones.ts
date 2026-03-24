import { Router, Request, Response } from 'express';
import { 
  getRepoMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  getRepoProjects,
  getProjectColumns,
  getColumnCards
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get milestones
router.get('/:owner/:repo/milestones', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const state = String(req.query.state || 'open');
    const data = await getRepoMilestones(user.accessToken, owner, repo, state);
    res.json(data);
  } catch (err: any) {
    console.error('Milestones error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch milestones' });
  }
});

// Get single milestone
router.get('/:owner/:repo/milestones/:number', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, number } = req.params;
    const data = await getMilestone(user.accessToken, owner, repo, parseInt(number));
    res.json(data);
  } catch (err: any) {
    console.error('Milestone error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch milestone' });
  }
});

// Create milestone
router.post('/:owner/:repo/milestones', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await createMilestone(user.accessToken, owner, repo, req.body);
    res.json(data);
  } catch (err: any) {
    console.error('Create milestone error:', err);
    res.status(500).json({ error: err.message || 'Failed to create milestone' });
  }
});

// Update milestone
router.patch('/:owner/:repo/milestones/:number', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, number } = req.params;
    const data = await updateMilestone(user.accessToken, owner, repo, parseInt(number), req.body);
    res.json(data);
  } catch (err: any) {
    console.error('Update milestone error:', err);
    res.status(500).json({ error: err.message || 'Failed to update milestone' });
  }
});

// Get projects (classic)
router.get('/:owner/:repo/projects', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getRepoProjects(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Projects error:', err);
    if (err.status === 410) {
      // Projects disabled
      return res.json([]);
    }
    res.status(500).json({ error: err.message || 'Failed to fetch projects' });
  }
});

// Get project columns
router.get('/projects/:projectId/columns', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { projectId } = req.params;
    const data = await getProjectColumns(user.accessToken, parseInt(projectId));
    res.json(data);
  } catch (err: any) {
    console.error('Project columns error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch project columns' });
  }
});

// Get column cards
router.get('/columns/:columnId/cards', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { columnId } = req.params;
    const data = await getColumnCards(user.accessToken, parseInt(columnId));
    res.json(data);
  } catch (err: any) {
    console.error('Column cards error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch column cards' });
  }
});

export default router;
