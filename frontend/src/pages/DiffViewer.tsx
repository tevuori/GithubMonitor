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
    author: {
      name: string;
      date: string;
      avatar: string;
      login: string;
    };
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

interface Branch {
  name: string;
  protected: boolean;
}

const DiffViewerInner = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [base, setBase] = useState<string>('');
  const [head, setHead] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Fetch repos
  const { data: repos, isLoading: reposLoading, isError: reposError } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await api.get('/api/repos');
      return res.data;
    },
  });

  // Auto-select first repo
  useEffect(() => {
    if (repos && repos.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0]);
    }
  }, [repos, selectedRepo]);

  // Fetch branches
  const { data: branches, isLoading: branchesLoading, isError: branchesError } = useQuery<Branch[]>({
    queryKey: ['branches', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Set default branches
  useEffect(() => {
    if (branches && branches.length > 0) {
      if (!base) {
        const mainBranch = branches.find(b => b.name === 'main' || b.name === 'master');
        setBase(mainBranch?.name || branches[0].name);
      }
      if (!head && branches.length > 1) {
        const nonMain = branches.find(b => b.name !== base);
        setHead(nonMain?.name || branches[0].name);
      }
    }
  }, [branches, base, head]);

  // Fetch comparison
  const { data: comparison, isLoading: comparing, error: compareError } = useQuery<CompareResult>({
    queryKey: ['compare', selectedRepo?.owner.login, selectedRepo?.name, base, head, viewMode],
    queryFn: async () => {
      if (!selectedRepo || !base || !head) throw new Error('Missing params');
      const res = await api.get(`/api/compare/${selectedRepo.owner.login}/${selectedRepo.name}/branches`, {
        params: { base, head },
      });
      return res.data;
    },
    enabled: !!selectedRepo && !!base && !!head && base !== head,
  });

  const toggleFile = (filename: string) => {
    const newSet = new Set(expandedFiles);
    if (newSet.has(filename)) {
      newSet.delete(filename);
    } else {
      newSet.add(filename);
    }
    setExpandedFiles(newSet);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-600 bg-green-50';
      case 'removed': return 'text-red-600 bg-red-50';
      case 'modified': return 'text-amber-600 bg-amber-50';
      case 'renamed': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderDiff = (patch: string | undefined) => {
    if (!patch) return <div className="p-4 text-gray-500 text-sm">No diff available</div>;

    const lines = patch.split('\n');
    return (
      <div className={`font-mono text-xs overflow-x-auto ${viewMode === 'split' ? 'grid grid-cols-2' : ''}`}>
        {lines.map((line, idx) => {
          let bgColor = 'bg-white';
          let textColor = 'text-gray-700';
          if (line.startsWith('+') && !line.startsWith('+++')) {
            bgColor = 'bg-green-50';
            textColor = 'text-green-800';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bgColor = 'bg-red-50';
            textColor = 'text-red-800';
          } else if (line.startsWith('@@')) {
            bgColor = 'bg-blue-50';
            textColor = 'text-blue-700';
          }
          return (
            <div key={idx} className={`${bgColor} ${textColor} px-4 py-0.5 whitespace-pre`}>{line}</div>
          );
        })}
      </div>
    );
  };

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="diff-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (reposError) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-red-700" data-testid="diff-repos-error">
        Failed to load repositories. Please check your connection and authentication.
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600" data-testid="diff-no-repos">
        No repositories available. Connect your GitHub account and ensure you have access to at least one repository.
      </div>
    );
  }

  const safeCommits = comparison?.commits || [];
  const safeFiles = comparison?.files || [];

  return (
    <div className="space-y-6" data-testid="diff-viewer-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Diff Viewer</h1>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Repository selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
            <select
              data-testid="diff-repo-selector"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedRepo?.full_name || repos[0].full_name}
              onChange={(e) => {
                const repo = repos.find(r => r.full_name === e.target.value) || null;
                setSelectedRepo(repo);
                setBase('');
                setHead('');
              }}
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
              ))}
            </select>
          </div>

          {/* Base branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base</label>
            <select
              data-testid="diff-base-selector"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              disabled={branchesLoading || !branches || branches.length === 0}
            >
              <option value="">Select base...</option>
              {branches?.map((branch) => (
                <option key={branch.name} value={branch.name}>{branch.name}</option>
              ))}
            </select>
          </div>

          {/* Head branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compare</label>
            <select
              data-testid="diff-head-selector"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={head}
              onChange={(e) => setHead(e.target.value)}
              disabled={branchesLoading || !branches || branches.length === 0}
            >
              <option value="">Select head...</option>
              {branches?.map((branch) => (
                <option key={branch.name} value={branch.name}>{branch.name}</option>
              ))}
            </select>
          </div>

          {/* View mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('unified')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'unified' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Split
              </button>
            </div>
          </div>
        </div>

        {branchesLoading && (
          <p className="mt-2 text-sm text-gray-500">Loading branches...</p>
        )}

        {branchesError && (
          <p className="mt-2 text-sm text-red-600">Failed to load branches for the selected repository.</p>
        )}
      </div>

      {/* Comparison Summary */}
      {comparison && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                comparison.status === 'ahead' ? 'bg-green-100 text-green-700' :
                comparison.status === 'behind' ? 'bg-amber-100 text-amber-700' :
                comparison.status === 'diverged' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {comparison.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">+{comparison.ahead_by} ahead</span>
              <span className="text-red-600">-{comparison.behind_by} behind</span>
              <span className="text-gray-600">{comparison.total_commits} commits</span>
              <span className="text-gray-600">{safeFiles.length} files changed</span>
            </div>
          </div>
        </div>
      )}

      {/* Commits */}
      {comparison && safeCommits.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Commits ({safeCommits.length})</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {safeCommits.map((commit) => (
              <div key={commit.sha} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                {commit.author?.avatar ? (
                  <img src={commit.author.avatar} alt={commit.author.name || commit.author.login} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {(commit.author?.name || commit.author?.login || '?').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{commit.message}</p>
                  <p className="text-xs text-gray-500">
                    {(commit.author?.login || commit.author?.name || 'Unknown')} · {commit.author?.date ? new Date(commit.author.date).toLocaleDateString() : ''}
                  </p>
                </div>
                <a
                  href={commit.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-blue-600 hover:underline"
                >
                  {commit.shortSha}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Changed */}
      {comparison && safeFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Files Changed ({safeFiles.length})</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">
                +{safeFiles.reduce((sum, f) => sum + f.additions, 0)}
              </span>
              <span className="text-red-600">
                -{safeFiles.reduce((sum, f) => sum + f.deletions, 0)}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {safeFiles.map((file) => (
              <div key={file.filename}>
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleFile(file.filename)}
                >
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedFiles.has(file.filename) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(file.status)}`}>
                    {file.status}
                  </span>
                  <span className="flex-1 font-mono text-sm text-gray-700 truncate">{file.filename}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600">+{file.additions}</span>
                    <span className="text-red-600">-{file.deletions}</span>
                  </div>
                </div>
                {expandedFiles.has(file.filename) && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {renderDiff(file.patch)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading / Error states */}
      {comparing && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Comparing branches...</p>
        </div>
      )}

      {compareError && (
        <div className="bg-red-50 rounded-lg p-4 text-red-700">
          Failed to compare branches. Make sure both branches exist and you have selected different branches.
        </div>
      )}

      {!comparing && !comparison && base && head && base !== head && !compareError && (
        <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
          No differences found between the selected branches.
        </div>
      )}

      {base === head && base && (
        <div className="bg-amber-50 rounded-lg p-4 text-amber-700">
          Please select different branches to compare.
        </div>
      )}

      {!base && !head && branches && branches.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 text-blue-700">
          Select a base and compare branch to see the diff between them.
        </div>
      )}
    </div>
  );
};

class DiffViewerErrorBoundary extends React.Component<{ children: any }, { hasError: boolean }> {
  constructor(props: { children: any }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('DiffViewer rendering error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 rounded-lg p-4 text-red-700">
          Something went wrong while rendering the Diff Viewer. Check the browser console for details.
        </div>
      );
    }
    return this.props.children;
  }
}

const DiffViewer = () => (
  <DiffViewerErrorBoundary>
    <DiffViewerInner />
  </DiffViewerErrorBoundary>
);

export default DiffViewer;
