import { Router, Request, Response } from 'express';
import { 
  getCodeFrequency,
  getCommitActivity,
  getPunchCard,
  getParticipation,
  getCommunityProfile
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get code frequency stats (additions/deletions per week)
router.get('/:owner/:repo/code-frequency', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getCodeFrequency(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Code frequency error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch code frequency' });
  }
});

// Get commit activity (commits per week for last year)
router.get('/:owner/:repo/commit-activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getCommitActivity(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Commit activity error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch commit activity' });
  }
});

// Get punch card (commits by day/hour)
router.get('/:owner/:repo/punch-card', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getPunchCard(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Punch card error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch punch card' });
  }
});

// Get participation (owner vs all commits per week)
router.get('/:owner/:repo/participation', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getParticipation(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Participation error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch participation' });
  }
});

// Get community profile
router.get('/:owner/:repo/community', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getCommunityProfile(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Community profile error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch community profile' });
  }
});

export default router;
