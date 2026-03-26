import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface CompareResult {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits?: Array<{
    sha: string;
    shortSha: string;
    message: string;
    author: { name: string; date: string; avatar: string; login: string };
    htmlUrl: string;
  }>;
  files?: Array<{
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    blob_url: string;
  }>;
  base_commit: { sha: string; message: string };
  merge_base_commit: { sha: string; message: string };
}

interface Branch { name: string; protected: boolean; }
interface BranchResponse { branches: Branch[]; defaultBranch: string; }

const DiffViewerInner = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [base, setBase] = useState<string>('');
  const [head, setHead] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { data: repos, isLoading: reposLoading, isError: reposError } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: async () => { const res = await api.get('/api/repos'); return res.data; },
  });

  useEffect(() => {
    if (repos && repos.length > 0 && !selectedRepo) setSelectedRepo(repos[0]);
  }, [repos, selectedRepo]);

  const { data: branchesData, isLoading: branchesLoading, isError: branchesError } = useQuery<BranchResponse>({
    queryKey: ['branches', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return { branches: [], defaultBranch: '' };
      const res = await api.get(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data as BranchResponse;
    },
    enabled: !!selectedRepo,
  });

  useEffect(() => {
    const list = branchesData?.branches || [];
    if (list.length > 0) {
      if (!base) {
        const mainBranch =
          list.find(b => b.name === (branchesData?.defaultBranch || 'main')) ||
          list.find(b => b.name === 'master') || list[0];
        setBase(mainBranch.name);
      }
      if (!head && list.length > 1) {
        const nonMain = list.find(b => b.name !== base) || list[0];
        setHead(nonMain.name);
      }
    }
  }, [branchesData, base, head]);

  const { data: comparison, isLoading: comparing, error: compareError } = useQuery<CompareResult>({
    queryKey: ['compare', selectedRepo?.owner.login, selectedRepo?.name, base, head, viewMode],
    queryFn: async () => {
      if (!selectedRepo || !base || !head) throw new Error('Missing params');
      const res = await api.get(`/api/compare/${selectedRepo.owner.login}/${selectedRepo.name}/branches`, { params: { base, head } });
      return res.data as CompareResult;
    },
    enabled: !!selectedRepo && !!base && !!head && base !== head,
  });

  const toggleFile = (filename: string) => {
    const newSet = new Set(expandedFiles);
    if (newSet.has(filename)) newSet.delete(filename); else newSet.add(filename);
    setExpandedFiles(newSet);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':    return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'removed':  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'modified': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
      case 'renamed':  return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:         return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  const renderDiff = (patch: string | undefined) => {
    if (!patch) return <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">No diff available</div>;
    const lines = patch.split('\n');
    return (
      <div className={`font-mono text-xs overflow-x-auto ${viewMode === 'split' ? 'grid grid-cols-2' : ''}`}>
        {lines.map((line, idx) => {
          let cls = 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300';
          if (line.startsWith('+') && !line.startsWith('+++'))
            cls = 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
          else if (line.startsWith('-') && !line.startsWith('---'))
            cls = 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
          else if (line.startsWith('@@'))
            cls = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
          return <div key={idx} className={`${cls} px-4 py-0.5 whitespace-pre`}>{line}</div>;
        })}
      </div>
    );
  };

  if (reposLoading) {
    return <div className="flex items-center justify-center h-64" data-testid="diff-loading">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>;
  }
  if (reposError) {
    return <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-red-700 dark:text-red-400" data-testid="diff-repos-error">
      Failed to load repositories. Please check your connection and authentication.
    </div>;
  }
  if (!repos || repos.length === 0) {
    return <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-600 dark:text-gray-400" data-testid="diff-no-repos">
      No repositories available. Connect your GitHub account and ensure you have access to at least one repository.
    </div>;
  }

  const branchList = branchesData?.branches || [];
  const safeCommits = comparison?.commits || [];
  const safeFiles = comparison?.files || [];

  return (
    <div className="space-y-6" data-testid="diff-viewer-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Diff Viewer</h1>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repository</label>
            <select
              data-testid="diff-repo-selector"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              value={selectedRepo?.full_name || repos[0].full_name}
              onChange={e => { const repo = repos.find(r => r.full_name === e.target.value) || null; setSelectedRepo(repo); setBase(''); setHead(''); }}
            >
              {repos.map(repo => <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base</label>
            <select
              data-testid="diff-base-selector"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              value={base} onChange={e => setBase(e.target.value)}
              disabled={branchesLoading || branchList.length === 0}
            >
              <option value="">Select base...</option>
              {branchList.map(branch => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Compare</label>
            <select
              data-testid="diff-head-selector"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              value={head} onChange={e => setHead(e.target.value)}
              disabled={branchesLoading || branchList.length === 0}
            >
              <option value="">Select head...</option>
              {branchList.map(branch => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">View</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setViewMode('unified')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'unified' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>Unified</button>
              <button type="button" onClick={() => setViewMode('split')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>Split</button>
            </div>
          </div>
        </div>
        {branchesLoading && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading branches...</p>}
        {branchesError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">Failed to load branches for the selected repository.</p>}
      </div>

      {/* Comparison Summary */}
      {comparison && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                comparison.status === 'ahead'   ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                comparison.status === 'behind'  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                comparison.status === 'diverged'? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>{comparison.status}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 dark:text-green-400">+{comparison.ahead_by} ahead</span>
              <span className="text-red-600 dark:text-red-400">-{comparison.behind_by} behind</span>
              <span className="text-gray-600 dark:text-gray-400">{comparison.total_commits} commits</span>
              <span className="text-gray-600 dark:text-gray-400">{safeFiles.length} files changed</span>
            </div>
          </div>
        </div>
      )}

      {/* Commits */}
      {comparison && safeCommits.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Commits ({safeCommits.length})</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
            {safeCommits.map(commit => (
              <div key={commit.sha} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                {commit.author?.avatar ? (
                  <img src={commit.author.avatar} alt={commit.author.name || commit.author.login} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                    {(commit.author?.name || commit.author?.login || '?').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{commit.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(commit.author?.login || commit.author?.name || 'Unknown')} · {commit.author?.date ? new Date(commit.author.date).toLocaleDateString() : ''}
                  </p>
                </div>
                <a href={commit.htmlUrl} target="_blank" rel="noreferrer"
                  className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline">{commit.shortSha}</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Changed */}
      {comparison && safeFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Files Changed ({safeFiles.length})</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 dark:text-green-400">+{safeFiles.reduce((s, f) => s + f.additions, 0)}</span>
              <span className="text-red-600 dark:text-red-400">-{safeFiles.reduce((s, f) => s + f.deletions, 0)}</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {safeFiles.map(file => (
              <div key={file.filename}>
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => toggleFile(file.filename)}>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedFiles.has(file.filename) ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(file.status)}`}>{file.status}</span>
                  <span className="flex-1 font-mono text-sm text-gray-700 dark:text-gray-300 truncate">{file.filename}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600 dark:text-green-400">+{file.additions}</span>
                    <span className="text-red-600 dark:text-red-400">-{file.deletions}</span>
                  </div>
                </div>
                {expandedFiles.has(file.filename) && (
                  <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">{renderDiff(file.patch)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {comparing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Comparing branches...</p>
        </div>
      )}
      {compareError && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-red-700 dark:text-red-400">
          Failed to compare branches. Make sure both branches exist and you have selected different branches.
        </div>
      )}
      {!comparing && !comparison && base && head && base !== head && !compareError && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-gray-600 dark:text-gray-400">
          No differences found between the selected branches.
        </div>
      )}
      {base === head && base && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-amber-700 dark:text-amber-400">
          Please select different branches to compare.
        </div>
      )}
      {!base && !head && branchList.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-blue-700 dark:text-blue-400">
          Select a base and compare branch to see the diff between them.
        </div>
      )}
    </div>
  );
};

class DiffViewerErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.error('DiffViewer rendering error:', error, info); }
  render() {
    if (this.state.hasError) {
      return <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-red-700 dark:text-red-400">
        Something went wrong while rendering the Diff Viewer. Check the browser console for details.
      </div>;
    }
    return this.props.children;
  }
}

const DiffViewer = () => <DiffViewerErrorBoundary><DiffViewerInner /></DiffViewerErrorBoundary>;
export default DiffViewer;
