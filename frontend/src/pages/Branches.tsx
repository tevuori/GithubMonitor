import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import GitGraph from '../components/GitGraph';
import type { GitGraphData } from '../types/gitGraph';
import toast from 'react-hot-toast';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface BranchListItem {
  name: string;
  protected: boolean;
}

interface BranchResponse {
  branches: BranchListItem[];
  defaultBranch: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal = ({ title, onClose, children }: ModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative z-10 bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Close modal">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Branch action dropdown ───────────────────────────────────────────────────
interface BranchActionsProps {
  branch: BranchListItem;
  isDefault: boolean;
  onRename: () => void;
  onSetDefault: () => void;
  onSquashMerge: () => void;
  onRebaseMerge: () => void;
  onDelete: () => void;
}

const BranchActions = ({ branch, isDefault, onRename, onSetDefault, onSquashMerge, onRebaseMerge, onDelete }: BranchActionsProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canDelete = !branch.protected && !isDefault;

  const item = (label: string, onClick: () => void, danger = false, disabled = false) => (
    <button
      key={label}
      onClick={() => { if (!disabled) { onClick(); setOpen(false); } }}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
        disabled
          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          : danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
        aria-label="Branch actions"
        title="Branch actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
          {item('Rename', onRename, false, branch.protected)}
          {item('Set as default', onSetDefault, false, isDefault)}
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          {item('Squash merge into…', onSquashMerge)}
          {item('Rebase merge into…', onRebaseMerge)}
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          {item('Delete', onDelete, true, !canDelete)}
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Branches = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [perPage, setPerPage] = useState(50);
  const [showBranchManager, setShowBranchManager] = useState(false);

  // Modal state
  type ActiveModal =
    | { type: 'rename'; branch: string }
    | { type: 'setDefault'; branch: string }
    | { type: 'squashMerge'; branch: string }
    | { type: 'rebaseMerge'; branch: string }
    | null;

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [renameValue, setRenameValue] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [squashTitle, setSquashTitle] = useState('');

  const queryClient = useQueryClient();

  const { data: repos, isLoading: reposLoading } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: async () => (await api.get('/api/repos')).data,
  });

  useEffect(() => {
    if (repos && repos.length > 0 && !selectedRepo) setSelectedRepo(repos[0]);
  }, [repos, selectedRepo]);

  const {
    data: branchesData,
    isLoading: branchesLoading,
    error: branchesError,
    refetch: refetchBranches,
  } = useQuery<BranchResponse>({
    queryKey: ['branchesList', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) throw new Error('No repo selected');
      return (await api.get(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}`)).data;
    },
    enabled: !!selectedRepo,
  });

  const { data: graphData, isLoading: graphLoading, error: graphError, refetch } = useQuery<GitGraphData>({
    queryKey: ['gitGraph', selectedRepo?.owner.login, selectedRepo?.name, perPage],
    queryFn: async () => {
      if (!selectedRepo) throw new Error('No repo selected');
      return (await api.get(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}/graph`, { params: { perPage } })).data;
    },
    enabled: !!selectedRepo,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['branchesList', selectedRepo?.owner.login, selectedRepo?.name] });
    queryClient.invalidateQueries({ queryKey: ['gitGraph', selectedRepo?.owner.login, selectedRepo?.name] });
    refetchBranches();
    refetch();
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteBranchMutation = useMutation({
    mutationFn: async (branchName: string) => {
      if (!selectedRepo) throw new Error('No repo selected');
      await api.delete(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}/${encodeURIComponent(branchName)}`);
    },
    onSuccess: () => { toast.success('Branch deleted'); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to delete branch'),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ branch, newName }: { branch: string; newName: string }) => {
      if (!selectedRepo) throw new Error('No repo selected');
      await api.post(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}/${encodeURIComponent(branch)}/rename`, { newName });
    },
    onSuccess: () => { toast.success('Branch renamed'); setActiveModal(null); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to rename branch'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (branch: string) => {
      if (!selectedRepo) throw new Error('No repo selected');
      await api.patch(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}/default`, { branch });
    },
    onSuccess: () => { toast.success('Default branch updated'); setActiveModal(null); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to set default branch'),
  });

  const squashMergeMutation = useMutation({
    mutationFn: async ({ head, base, commitTitle }: { head: string; base: string; commitTitle?: string }) => {
      if (!selectedRepo) throw new Error('No repo selected');
      await api.post(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}/squash-merge`, { head, base, commitTitle });
    },
    onSuccess: () => { toast.success('Squash merge successful'); setActiveModal(null); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Squash merge failed'),
  });

  const rebaseMergeMutation = useMutation({
    mutationFn: async ({ head, base }: { head: string; base: string }) => {
      if (!selectedRepo) throw new Error('No repo selected');
      await api.post(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}/rebase-merge`, { head, base });
    },
    onSuccess: () => { toast.success('Rebase merge successful'); setActiveModal(null); invalidate(); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Rebase merge failed'),
  });

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="branches-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const defaultBranch = branchesData?.defaultBranch || '';
  const branchList = branchesData?.branches || [];
  const otherBranches = branchList.filter(b => b.name !== (activeModal && 'branch' in activeModal ? activeModal.branch : ''));

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900" data-testid="branches-page">

      {/* ── Modals ── */}

      {activeModal?.type === 'rename' && (
        <Modal title={`Rename "${activeModal.branch}"`} onClose={() => setActiveModal(null)}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New name</label>
          <input
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && renameValue.trim() && renameMutation.mutate({ branch: activeModal.branch, newName: renameValue.trim() })}
            placeholder="new-branch-name"
          />
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button
              onClick={() => renameMutation.mutate({ branch: activeModal.branch, newName: renameValue.trim() })}
              disabled={!renameValue.trim() || renameMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {renameMutation.isPending ? 'Renaming…' : 'Rename'}
            </button>
          </div>
        </Modal>
      )}

      {activeModal?.type === 'setDefault' && (
        <Modal title={`Set "${activeModal.branch}" as default?`} onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            The default branch will change from <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{defaultBranch}</code> to{' '}
            <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{activeModal.branch}</code>.
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button
              onClick={() => setDefaultMutation.mutate(activeModal.branch)}
              disabled={setDefaultMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {setDefaultMutation.isPending ? 'Updating…' : 'Set as default'}
            </button>
          </div>
        </Modal>
      )}

      {activeModal?.type === 'squashMerge' && (
        <Modal title={`Squash merge "${activeModal.branch}" into…`} onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            All commits from <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{activeModal.branch}</code> will be squashed into one commit on the target branch.
          </p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target branch</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={mergeTarget}
            onChange={e => setMergeTarget(e.target.value)}
          >
            <option value="">Select target branch…</option>
            {branchList.filter(b => b.name !== activeModal.branch).map(b => (
              <option key={b.name} value={b.name}>{b.name}{b.name === defaultBranch ? ' (default)' : ''}</option>
            ))}
          </select>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commit title (optional)</label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={squashTitle}
            onChange={e => setSquashTitle(e.target.value)}
            placeholder={`Squash merge ${activeModal.branch}`}
          />
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button
              onClick={() => squashMergeMutation.mutate({ head: activeModal.branch, base: mergeTarget, commitTitle: squashTitle || undefined })}
              disabled={!mergeTarget || squashMergeMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
            >
              {squashMergeMutation.isPending ? 'Merging…' : 'Squash merge'}
            </button>
          </div>
        </Modal>
      )}

      {activeModal?.type === 'rebaseMerge' && (
        <Modal title={`Rebase merge "${activeModal.branch}" into…`} onClose={() => setActiveModal(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Commits from <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{activeModal.branch}</code> will be replayed onto the target branch via rebase.
          </p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target branch</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={mergeTarget}
            onChange={e => setMergeTarget(e.target.value)}
          >
            <option value="">Select target branch…</option>
            {branchList.filter(b => b.name !== activeModal.branch).map(b => (
              <option key={b.name} value={b.name}>{b.name}{b.name === defaultBranch ? ' (default)' : ''}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
            <button
              onClick={() => rebaseMergeMutation.mutate({ head: activeModal.branch, base: mergeTarget })}
              disabled={!mergeTarget || rebaseMergeMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              {rebaseMergeMutation.isPending ? 'Rebasing…' : 'Rebase merge'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Git Graph</h1>
          <select
            data-testid="repo-selector"
            className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedRepo?.full_name || ''}
            onChange={(e) => {
              const repo = repos?.find(r => r.full_name === e.target.value);
              setSelectedRepo(repo || null);
              setShowBranchManager(false);
            }}
          >
            {repos?.map((repo) => (
              <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Commits:</label>
            <select
              data-testid="commits-selector"
              className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <button
            data-testid="branch-manager-btn"
            onClick={() => setShowBranchManager(v => !v)}
            className="px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-600"
            disabled={!selectedRepo}
            title="Manage branches"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v12m0 0a3 3 0 106 0m-6 0a3 3 0 016 0m6-12v6m0 0a3 3 0 106 0m-6 0a3 3 0 016 0" />
            </svg>
            Branches
          </button>

          <button
            data-testid="refresh-btn"
            onClick={() => { refetch(); refetchBranches(); }}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Branch Manager Panel ── */}
      {showBranchManager && selectedRepo && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Branch manager</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Default: <span className="font-mono">{defaultBranch || '—'}</span>
              </p>
            </div>
            <button
              onClick={() => setShowBranchManager(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {branchesLoading ? (
            <div className="py-4 text-sm text-gray-500">Loading branches…</div>
          ) : branchesError ? (
            <div className="py-4 text-sm text-red-600">Failed to load branches.</div>
          ) : branchList.length === 0 ? (
            <div className="py-4 text-sm text-gray-500">No branches found.</div>
          ) : (
            <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              {branchList.map((b) => {
                const isDefault = defaultBranch !== '' && b.name === defaultBranch;
                const canDelete = !b.protected && !isDefault;
                return (
                  <div
                    key={b.name}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate">{b.name}</span>
                      {b.protected && (
                        <span className="shrink-0 px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded">protected</span>
                      )}
                      {isDefault && (
                        <span className="shrink-0 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded">default</span>
                      )}
                    </div>

                    <BranchActions
                      branch={b}
                      isDefault={isDefault}
                      onRename={() => { setRenameValue(b.name); setActiveModal({ type: 'rename', branch: b.name }); }}
                      onSetDefault={() => setActiveModal({ type: 'setDefault', branch: b.name })}
                      onSquashMerge={() => { setMergeTarget(''); setSquashTitle(''); setActiveModal({ type: 'squashMerge', branch: b.name }); }}
                      onRebaseMerge={() => { setMergeTarget(''); setActiveModal({ type: 'rebaseMerge', branch: b.name }); }}
                      onDelete={() => {
                        if (!canDelete) return;
                        if (!confirm(`Delete branch "${b.name}"?`)) return;
                        deleteBranchMutation.mutate(b.name);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Stats Bar ── */}
      {graphData && (
        <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-700/50 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">Branches:</span>
            <span className="text-gray-900 dark:text-gray-200 font-medium" data-testid="branch-count">{graphData.branches.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">Commits:</span>
            <span className="text-gray-900 dark:text-gray-200 font-medium" data-testid="commit-count">{graphData.totalCommits}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">Protected:</span>
            <span className="text-gray-900 dark:text-gray-200 font-medium" data-testid="protected-count">
              {graphData.branches.filter(b => b.protected).length}
            </span>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden">
        {graphLoading ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900" data-testid="graph-loading">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
              <p className="text-gray-600 dark:text-gray-400">Loading git graph...</p>
            </div>
          </div>
        ) : graphError ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900" data-testid="graph-error">
            <div className="text-center">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Failed to load git graph</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Please make sure you have access to this repository.</p>
              <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                Try Again
              </button>
            </div>
          </div>
        ) : graphData && selectedRepo ? (
          <GitGraph data={graphData} owner={selectedRepo.owner.login} repo={selectedRepo.name} />
        ) : (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900" data-testid="no-repo">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No Repository Selected</h3>
              <p className="text-gray-600 dark:text-gray-400">Select a repository to view its git graph.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Branches;
