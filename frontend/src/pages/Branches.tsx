import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import GitGraph from '../components/GitGraph';

const Branches: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph');
  const [commitLimit, setCommitLimit] = useState(100);

  const { data: repos } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get('/api/repos').then((r) => r.data),
  });

  const [owner, repo] = selectedRepo.split('/');

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', selectedRepo],
    queryFn: () => api.get('/api/branches/' + owner + '/' + repo).then((r) => r.data),
    enabled: !!selectedRepo && viewMode === 'list',
  });

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['gitGraph', selectedRepo, commitLimit],
    queryFn: () => api.get('/api/branches/' + owner + '/' + repo + '/graph?perPage=' + commitLimit).then((r) => r.data),
    enabled: !!selectedRepo && viewMode === 'graph',
  });

  const isLoading = viewMode === 'list' ? branchesLoading : graphLoading;

  return (
    <div className="h-full flex flex-col" data-testid="branches-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Branches</h1>
          <p className="mt-1 text-sm text-gray-500">
            {viewMode === 'graph' ? 'Visual git history and branch structure' : 'All branches in the repository'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <select
          data-testid="repo-selector"
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
        >
          <option value="">Select a repository</option>
          {repos?.map((r: any) => (
            <option key={r.id} value={r.full_name}>
              {r.full_name}
            </option>
          ))}
        </select>

        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            data-testid="view-graph-btn"
            onClick={() => setViewMode('graph')}
            className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (viewMode === 'graph' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Graph
            </span>
          </button>
          <button
            data-testid="view-list-btn"
            onClick={() => setViewMode('list')}
            className={'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' + (viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </span>
          </button>
        </div>

        {viewMode === 'graph' && selectedRepo && (
          <select
            data-testid="commit-limit-selector"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
            value={commitLimit}
            onChange={(e) => setCommitLimit(Number(e.target.value))}
          >
            <option value={50}>Last 50 commits</option>
            <option value={100}>Last 100 commits</option>
            <option value={200}>Last 200 commits</option>
            <option value={500}>Last 500 commits</option>
          </select>
        )}

        {viewMode === 'graph' && graphData && (
          <div className="ml-auto flex items-center gap-4 text-sm text-gray-500">
            <span>
              <strong className="text-gray-900">{graphData.branches.length}</strong> branches
            </span>
            <span>
              <strong className="text-gray-900">{graphData.totalCommits}</strong> commits
            </span>
          </div>
        )}
      </div>

      {!selectedRepo ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <p className="text-gray-500 text-lg">Select a repository to view branches</p>
            <p className="text-gray-400 text-sm mt-1">Choose from your repositories above</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading {viewMode === 'graph' ? 'git graph' : 'branches'}...</p>
          </div>
        </div>
      ) : viewMode === 'graph' && graphData ? (
        <div className="flex-1 bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-700" data-testid="git-graph-container">
          <GitGraph data={graphData} owner={owner} repo={repo} />
        </div>
      ) : viewMode === 'list' && branches ? (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 divide-y divide-gray-100" data-testid="branches-list">
          {branches.length === 0 ? (
            <p className="p-6 text-gray-400 text-center">No branches found.</p>
          ) : (
            branches.map((b: any) => (
              <div key={b.name} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 font-mono">{b.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  {b.protected && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">
                      protected
                    </span>
                  )}
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {b.commit.sha.slice(0, 7)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Branches;
