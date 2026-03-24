import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import GitGraph from '../components/GitGraph';
import type { GitGraphData } from '../types/gitGraph';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

const Branches = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [perPage, setPerPage] = useState(50);

  // Fetch user's repositories
  const { data: repos, isLoading: reposLoading } = useQuery<Repository[]>({
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

  // Fetch git graph data for selected repo
  const { data: graphData, isLoading: graphLoading, error: graphError, refetch } = useQuery<GitGraphData>({
    queryKey: ['gitGraph', selectedRepo?.owner.login, selectedRepo?.name, perPage],
    queryFn: async () => {
      if (!selectedRepo) throw new Error('No repo selected');
      const res = await api.get(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}/graph`, {
        params: { perPage },
      });
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="branches-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900" data-testid="branches-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Git Graph</h1>
          
          {/* Repository Selector */}
          <select
            data-testid="repo-selector"
            className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedRepo?.full_name || ''}
            onChange={(e) => {
              const repo = repos?.find(r => r.full_name === e.target.value);
              setSelectedRepo(repo || null);
            }}
          >
            {repos?.map((repo) => (
              <option key={repo.id} value={repo.full_name}>
                {repo.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Commits per branch */}
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

          {/* Refresh button */}
          <button
            data-testid="refresh-btn"
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {graphLoading ? (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900" data-testid="graph-loading">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : graphData && selectedRepo ? (
          <GitGraph
            data={graphData}
            owner={selectedRepo.owner.login}
            repo={selectedRepo.name}
          />
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
