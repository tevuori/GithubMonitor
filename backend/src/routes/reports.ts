import { Router, Request, Response } from 'express';
import { 
  getRepoStats,
  getUserRepos,
  getContributorStats,
  getRepoCommits,
  getUserPullRequests,
  getUserIssues
} from '../services/github';

const router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Generate repository report data
router.get('/repo/:owner/:repo', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    
    const [repoStats, contributors, commits] = await Promise.all([
      getRepoStats(user.accessToken, owner, repo),
      getContributorStats(user.accessToken, owner, repo).catch(() => []),
      getRepoCommits(user.accessToken, owner, repo),
    ]);
    
    res.json({
      repository: repoStats.repo,
      contributors,
      recentCommits: commits,
      openIssues: repoStats.openIssues,
      openPulls: repoStats.openPulls,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Repo report error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate repo report' });
  }
});

// Generate user activity report
router.get('/user', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    const [repos, prs, issues] = await Promise.all([
      getUserRepos(user.accessToken),
      getUserPullRequests(user.accessToken).catch(() => []),
      getUserIssues(user.accessToken).catch(() => []),
    ]);
    
    // Calculate stats
    const totalStars = repos.reduce((sum: number, r: any) => sum + (r.stargazers_count || 0), 0);
    const totalForks = repos.reduce((sum: number, r: any) => sum + (r.forks_count || 0), 0);
    const languages = repos.reduce((acc: Record<string, number>, r: any) => {
      if (r.language) {
        acc[r.language] = (acc[r.language] || 0) + 1;
      }
      return acc;
    }, {});
    
    res.json({
      summary: {
        totalRepos: repos.length,
        publicRepos: repos.filter((r: any) => !r.private).length,
        privateRepos: repos.filter((r: any) => r.private).length,
        totalStars,
        totalForks,
        openPRs: prs.length,
        openIssues: issues.length,
      },
      languages: Object.entries(languages)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => (b.count as number) - (a.count as number)),
      topRepos: repos
        .sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        .slice(0, 10)
        .map((r: any) => ({
          name: r.full_name,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          updatedAt: r.updated_at,
        })),
      recentPRs: prs.slice(0, 10),
      recentIssues: issues.slice(0, 10),
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('User report error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate user report' });
  }
});

// Generate weekly activity report
router.get('/weekly', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const [repos, prs, issues] = await Promise.all([
      getUserRepos(user.accessToken),
      getUserPullRequests(user.accessToken).catch(() => []),
      getUserIssues(user.accessToken).catch(() => []),
    ]);
    
    // Filter to last week
    const recentPRs = prs.filter((pr: any) => new Date(pr.created_at) >= oneWeekAgo);
    const recentIssues = issues.filter((issue: any) => new Date(issue.created_at) >= oneWeekAgo);
    const updatedRepos = repos.filter((r: any) => new Date(r.updated_at) >= oneWeekAgo);
    
    res.json({
      period: {
        start: oneWeekAgo.toISOString(),
        end: new Date().toISOString(),
      },
      summary: {
        reposUpdated: updatedRepos.length,
        prsCreated: recentPRs.length,
        issuesCreated: recentIssues.length,
      },
      updatedRepos: updatedRepos.map((r: any) => ({
        name: r.full_name,
        updatedAt: r.updated_at,
      })),
      pullRequests: recentPRs,
      issues: recentIssues,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Weekly report error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate weekly report' });
  }
});

export default router;
