import { Router, Request, Response } from 'express';
import { searchCode, searchRepos } from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Search code across repos
router.get('/code', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const query = String(req.query.q || '');
    const page = parseInt(String(req.query.page)) || 1;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const results = await searchCode(user.accessToken, query, page);
    res.json(results);
  } catch (err: any) {
    console.error('Code search error:', err);
    res.status(500).json({ error: 'Failed to search code', message: err.message });
  }
});

// Search repositories
router.get('/repos', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const query = String(req.query.q || '');
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const results = await searchRepos(user.accessToken, query);
    res.json(results);
  } catch (err: any) {
    console.error('Repo search error:', err);
    res.status(500).json({ error: 'Failed to search repos', message: err.message });
  }
});

export default router;
