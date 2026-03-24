import { Router, Request, Response } from 'express';
import { 
  getRepoReleases, 
  getRelease, 
  createRelease,
  getReleaseAssets,
  getRepoTags
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// List releases for a repo
router.get('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const page = parseInt(String(req.query.page)) || 1;
    const data = await getRepoReleases(user.accessToken, owner, repo, page);
    res.json(data);
  } catch (err: any) {
    console.error('Get releases error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch releases' });
  }
});

// Get tags for a repo
router.get('/:owner/:repo/tags', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const data = await getRepoTags(user.accessToken, owner, repo);
    res.json(data);
  } catch (err: any) {
    console.error('Get tags error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch tags' });
  }
});

// Get a specific release
router.get('/:owner/:repo/release/:releaseId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, releaseId } = req.params;
    const data = await getRelease(user.accessToken, owner, repo, parseInt(releaseId));
    res.json(data);
  } catch (err: any) {
    console.error('Get release error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch release' });
  }
});

// Get release assets
router.get('/:owner/:repo/release/:releaseId/assets', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo, releaseId } = req.params;
    const data = await getReleaseAssets(user.accessToken, owner, repo, parseInt(releaseId));
    res.json(data);
  } catch (err: any) {
    console.error('Get release assets error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch release assets' });
  }
});

// Create a new release
router.post('/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const { tag_name, name, body, draft, prerelease, target_commitish } = req.body;
    
    if (!tag_name) {
      return res.status(400).json({ error: 'tag_name is required' });
    }
    
    const data = await createRelease(user.accessToken, owner, repo, {
      tag_name,
      name,
      body,
      draft: draft || false,
      prerelease: prerelease || false,
      target_commitish
    });
    res.json(data);
  } catch (err: any) {
    console.error('Create release error:', err);
    res.status(500).json({ error: err.message || 'Failed to create release' });
  }
});

export default router;
