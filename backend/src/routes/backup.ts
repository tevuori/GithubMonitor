import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Auth guard
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// Storage path for snapshots metadata (JSON file on disk)
const SNAPSHOTS_FILE = path.resolve(__dirname, '../../../memory/snapshots.json');

function loadSnapshots(): Record<string, any[]> {
  try {
    if (fs.existsSync(SNAPSHOTS_FILE)) {
      const raw = fs.readFileSync(SNAPSHOTS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

function saveSnapshots(data: Record<string, any[]>) {
  const dir = path.dirname(SNAPSHOTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function repoKey(owner: string, repo: string) {
  return `${owner}/${repo}`;
}

// GET /api/backup/:owner/:repo/snapshots
router.get('/:owner/:repo/snapshots', requireAuth, async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    const all = loadSnapshots();
    const key = repoKey(owner, repo);
    res.json(all[key] || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load snapshots' });
  }
});

// POST /api/backup/:owner/:repo/snapshot
// Body: { branch, label? }
router.post('/:owner/:repo/snapshot', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const { branch = 'main', label } = req.body;

    // Fetch current HEAD commit SHA for the branch
    const branchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      { headers: { Authorization: `token ${user.accessToken}`, Accept: 'application/vnd.github+json' } }
    );
    if (!branchRes.ok) {
      const err = await branchRes.json() as any;
      return res.status(branchRes.status).json({ error: err.message || 'Failed to fetch branch info' });
    }
    const branchData = await branchRes.json() as any;
    const sha = branchData.commit.sha;
    const commitMsg = branchData.commit.commit.message;

    // Fetch file tree (recursive)
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
      { headers: { Authorization: `token ${user.accessToken}`, Accept: 'application/vnd.github+json' } }
    );
    const treeData = await treeRes.json() as any;
    const fileCount = (treeData.tree || []).filter((t: any) => t.type === 'blob').length;

    const snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: label || `Snapshot ${new Date().toLocaleString()}`,
      branch,
      sha,
      commitMessage: commitMsg,
      fileCount,
      createdAt: new Date().toISOString(),
    };

    const all = loadSnapshots();
    const key = repoKey(owner, repo);
    if (!all[key]) all[key] = [];
    all[key].unshift(snapshot); // newest first
    saveSnapshots(all);

    res.json(snapshot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// POST /api/backup/:owner/:repo/revert
// Body: { snapshotId }
router.post('/:owner/:repo/revert', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { owner, repo } = req.params;
    const { snapshotId } = req.body;

    const all = loadSnapshots();
    const key = repoKey(owner, repo);
    const snapshots: any[] = all[key] || [];
    const snapshot = snapshots.find((s: any) => s.id === snapshotId);
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

    // Force-update the branch ref to the snapshot SHA
    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${snapshot.branch}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `token ${user.accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sha: snapshot.sha, force: true }),
      }
    );

    if (!updateRes.ok) {
      const errData = await updateRes.json() as any;
      return res.status(updateRes.status).json({ error: errData.message || 'Revert failed' });
    }

    const updated = await updateRes.json();
    res.json({ success: true, ref: (updated as any).ref, sha: snapshot.sha });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Revert operation failed' });
  }
});

// DELETE /api/backup/:owner/:repo/snapshots/:id
router.delete('/:owner/:repo/snapshots/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { owner, repo, id } = req.params;
    const all = loadSnapshots();
    const key = repoKey(owner, repo);
    if (!all[key]) return res.status(404).json({ error: 'No snapshots found for this repo' });
    const before = all[key].length;
    all[key] = all[key].filter((s: any) => s.id !== id);
    if (all[key].length === before) return res.status(404).json({ error: 'Snapshot not found' });
    saveSnapshots(all);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

export default router;
