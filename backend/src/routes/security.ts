import { Router, Request, Response } from 'express';
import { 
  getSecurityAlerts,
  getDependabotAlerts,
  getCodeScanningAlerts,
  getSecretScanningAlerts
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get Dependabot alerts
router.get('/:owner/:repo/dependabot', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const state = String(req.query.state || 'open');
    const severity = req.query.severity ? String(req.query.severity) : undefined;
    const data = await getDependabotAlerts(user.accessToken, owner, repo, state, severity);
    res.json(data);
  } catch (err: any) {
    console.error('Dependabot alerts error:', err);
    // Return empty array if user doesn't have access (common for public repos)
    if (err.status === 403 || err.status === 404) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message || 'Failed to fetch dependabot alerts' });
  }
});

// Get code scanning alerts
router.get('/:owner/:repo/code-scanning', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const state = String(req.query.state || 'open');
    const data = await getCodeScanningAlerts(user.accessToken, owner, repo, state);
    res.json(data);
  } catch (err: any) {
    console.error('Code scanning alerts error:', err);
    if (err.status === 403 || err.status === 404) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message || 'Failed to fetch code scanning alerts' });
  }
});

// Get secret scanning alerts
router.get('/:owner/:repo/secret-scanning', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const state = String(req.query.state || 'open');
    const data = await getSecretScanningAlerts(user.accessToken, owner, repo, state);
    res.json(data);
  } catch (err: any) {
    console.error('Secret scanning alerts error:', err);
    if (err.status === 403 || err.status === 404) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message || 'Failed to fetch secret scanning alerts' });
  }
});

// Get all security alerts summary
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getSecurityAlerts(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Security alerts error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch security alerts' });
  }
});

export default router;
