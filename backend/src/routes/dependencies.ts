import { Router, Request, Response } from 'express';
import { 
  getDependencyGraph,
  getDependabotAlerts
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get dependency graph (SBOM)
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getDependencyGraph(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Dependency graph error:', err);
    if (err.status === 404 || err.status === 403) {
      return res.json({ manifests: [], dependencies: [] });
    }
    res.status(500).json({ error: err.message || 'Failed to fetch dependency graph' });
  }
});

export default router;
