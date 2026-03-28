import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Snapshot {
  id: string;
  label: string;
  branch: string;
  sha: string;
  commitMessage: string;
  fileCount: number;
  createdAt: string;
}

const ArchiveIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const RevertIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const Backup: React.FC = () => {
  const queryClient = useQueryClient();
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [label, setLabel] = useState('');
  const [revertConfirm, setRevertConfirm] = useState<string | null>(null);
  const [activeRepo, setActiveRepo] = useState<{ owner: string; repo: string } | null>(null);

  const snapshotsQuery = useQuery<Snapshot[]>({
    queryKey: ['snapshots', activeRepo?.owner, activeRepo?.repo],
    queryFn: async () => {
      if (!activeRepo) return [];
      const res = await api.get(`/api/backup/${activeRepo.owner}/${activeRepo.repo}/snapshots`);
      return res.data;
    },
    enabled: !!activeRepo,
  });

  const createSnapshot = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/backup/${owner}/${repo}/snapshot`, { branch, label });
      return res.data;
    },
    onSuccess: (snap: Snapshot) => {
      toast.success(`Snapshot "${snap.label}" created!`);
      setActiveRepo({ owner, repo });
      queryClient.invalidateQueries({ queryKey: ['snapshots', owner, repo] });
      setLabel('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to create snapshot');
    },
  });

  const revertMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      const res = await api.post(`/api/backup/${activeRepo!.owner}/${activeRepo!.repo}/revert`, { snapshotId });
      return res.data;
    },
    onSuccess: (_data, snapshotId) => {
      const snap = snapshotsQuery.data?.find(s => s.id === snapshotId);
      toast.success(`Reverted to snapshot "${snap?.label || snapshotId}" successfully!`);
      setRevertConfirm(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Revert failed');
      setRevertConfirm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      await api.delete(`/api/backup/${activeRepo!.owner}/${activeRepo!.repo}/snapshots/${snapshotId}`);
    },
    onSuccess: () => {
      toast.success('Snapshot deleted');
      queryClient.invalidateQueries({ queryKey: ['snapshots', activeRepo?.owner, activeRepo?.repo] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete snapshot');
    },
  });

  const handleLoad = () => {
    if (!owner.trim() || !repo.trim()) {
      toast.error('Please enter both owner and repository name');
      return;
    }
    setActiveRepo({ owner: owner.trim(), repo: repo.trim() });
    queryClient.invalidateQueries({ queryKey: ['snapshots', owner.trim(), repo.trim()] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ArchiveIcon />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repository Backup & Revert</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create snapshots of any repository branch and revert to them at any time.
          </p>
        </div>
      </div>

      {/* Repo selector */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Select Repository</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Owner</label>
            <input
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="e.g. tevuori"
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Repository</label>
            <input
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="e.g. GithubMonitor"
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleLoad}
              className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
            >
              Load Snapshots
            </button>
          </div>
        </div>
      </div>

      {/* Create snapshot */}
      {activeRepo && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Create New Snapshot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Branch</label>
              <input
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="main"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Label (optional)</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Before refactor"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => createSnapshot.mutate()}
                disabled={createSnapshot.isPending}
                className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {createSnapshot.isPending ? 'Creating...' : '📸 Create Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot list */}
      {activeRepo && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Snapshots for{' '}
            <span className="font-mono text-primary">{activeRepo.owner}/{activeRepo.repo}</span>
          </h2>

          {snapshotsQuery.isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {snapshotsQuery.isError && (
            <p className="text-sm text-destructive">Failed to load snapshots.</p>
          )}

          {snapshotsQuery.data && snapshotsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No snapshots yet. Create one above.</p>
          )}

          {snapshotsQuery.data && snapshotsQuery.data.length > 0 && (
            <div className="divide-y divide-border">
              {snapshotsQuery.data.map((snap) => (
                <div key={snap.id} className="py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{snap.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{snap.branch}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {snap.commitMessage}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>SHA: <span className="font-mono">{snap.sha.slice(0, 8)}</span></span>
                      <span>{snap.fileCount} files</span>
                      <span>{new Date(snap.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {revertConfirm === snap.id ? (
                      <>
                        <span className="text-xs text-amber-600 dark:text-amber-400 self-center">Sure?</span>
                        <button
                          onClick={() => revertMutation.mutate(snap.id)}
                          disabled={revertMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-50"
                        >
                          <RevertIcon /> {revertMutation.isPending ? 'Reverting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setRevertConfirm(null)}
                          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setRevertConfirm(snap.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-border rounded-md text-foreground hover:bg-muted"
                      >
                        <RevertIcon /> Revert
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(snap.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted disabled:opacity-50"
                      title="Delete snapshot"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Backup;
