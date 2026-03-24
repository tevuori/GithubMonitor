import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';

const PullRequests: React.FC = () => {
  const { data: pulls, isLoading, isError } = useQuery({ 
    queryKey: ['pulls'], 
    queryFn: () => api.get('/api/pulls').then(r => r.data) 
  });

  const extractRepoInfo = (pr: any) => {
    // repository_url looks like: https://api.github.com/repos/owner/repo
    const parts = pr.repository_url?.split('/') || [];
    const repo = parts[parts.length - 1];
    const owner = parts[parts.length - 2];
    return { owner, repo };
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Pull Requests</h1>
      <p className="mt-1 text-sm text-gray-500">Your open pull requests across all repositories</p>
      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
        {isLoading && <p className="p-4 text-gray-500">Loading pull requests...</p>}
        {isError && <p className="p-4 text-red-500">Failed to load pull requests.</p>}
        {pulls?.length === 0 && <p className="p-4 text-gray-400">No open pull requests.</p>}
        {pulls?.map((pr: any) => {
          const { owner, repo } = extractRepoInfo(pr);
          return (
            <div key={pr.id} className="p-4 flex items-start justify-between hover:bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link 
                    to={`/pull-requests/${owner}/${repo}/${pr.number}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {pr.title}
                  </Link>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    pr.draft ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {pr.draft ? 'Draft' : 'Open'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {owner}/{repo} · #{pr.number}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-gray-400">
                    {new Date(pr.updated_at).toLocaleDateString()}
                  </span>
                  {pr.comments > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      💬 {pr.comments}
                    </div>
                  )}
                </div>
                <Link
                  to={`/pull-requests/${owner}/${repo}/${pr.number}`}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  View Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PullRequests;
