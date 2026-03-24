import { Router, Request, Response } from 'express';
import { getRepoContents, getFileContent, getRepoTree } from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Get repo contents (directory listing or file)
router.get('/:owner/:repo/contents', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const path = String(req.query.path || '');
    const ref = req.query.ref ? String(req.query.ref) : undefined;
    
    const contents = await getRepoContents(user.accessToken, owner, repo, path, ref);
    res.json(contents);
  } catch (err: any) {
    console.error('Get contents error:', err);
    res.status(500).json({ error: 'Failed to get contents', message: err.message });
  }
});

// Get file content with decoded content
router.get('/:owner/:repo/file', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const path = String(req.query.path || '');
    const ref = req.query.ref ? String(req.query.ref) : undefined;
    
    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    const file = await getFileContent(user.accessToken, owner, repo, path, ref);
    res.json(file);
  } catch (err: any) {
    console.error('Get file error:', err);
    res.status(500).json({ error: 'Failed to get file', message: err.message });
  }
});

// Get full repo tree
router.get('/:owner/:repo/tree', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const sha = req.query.sha ? String(req.query.sha) : 'HEAD';
    
    const tree = await getRepoTree(user.accessToken, owner, repo, sha);
    res.json(tree);
  } catch (err: any) {
    console.error('Get tree error:', err);
    res.status(500).json({ error: 'Failed to get tree', message: err.message });
  }
});

export default router;
