import { Router, Request, Response } from 'express';
import { getUserOrgs, getOrgDetails, getOrgMembers, getOrgTeams, getOrgRepos } from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get user's organizations
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const orgs = await getUserOrgs(user.accessToken);
    res.json(orgs);
  } catch (err: any) {
    console.error('Get orgs error:', err);
    res.status(500).json({ error: 'Failed to get organizations', message: err.message });
  }
});

// Get org details
router.get('/:org', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const org = String(req.params.org);
    const details = await getOrgDetails(user.accessToken, org);
    res.json(details);
  } catch (err: any) {
    console.error('Get org details error:', err);
    res.status(500).json({ error: 'Failed to get org details', message: err.message });
  }
});

// Get org members
router.get('/:org/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const org = String(req.params.org);
    const members = await getOrgMembers(user.accessToken, org);
    res.json(members);
  } catch (err: any) {
    console.error('Get org members error:', err);
    res.status(500).json({ error: 'Failed to get org members', message: err.message });
  }
});

// Get org teams
router.get('/:org/teams', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const org = String(req.params.org);
    const teams = await getOrgTeams(user.accessToken, org);
    res.json(teams);
  } catch (err: any) {
    console.error('Get org teams error:', err);
    res.status(500).json({ error: 'Failed to get org teams', message: err.message });
  }
});

// Get org repos
router.get('/:org/repos', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const org = String(req.params.org);
    const repos = await getOrgRepos(user.accessToken, org);
    res.json(repos);
  } catch (err: any) {
    console.error('Get org repos error:', err);
    res.status(500).json({ error: 'Failed to get org repos', message: err.message });
  }
});

// Get org dashboard (all data at once)
router.get('/:org/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const org = String(req.params.org);
    
    const [details, members, teams, repos] = await Promise.all([
      getOrgDetails(user.accessToken, org),
      getOrgMembers(user.accessToken, org).catch(() => []),
      getOrgTeams(user.accessToken, org).catch(() => []),
      getOrgRepos(user.accessToken, org).catch(() => []),
    ]);
    
    res.json({ details, members, teams, repos });
  } catch (err: any) {
    console.error('Get org dashboard error:', err);
    res.status(500).json({ error: 'Failed to get org dashboard', message: err.message });
  }
});

export default router;
