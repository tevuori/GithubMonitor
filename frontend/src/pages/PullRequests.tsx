import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const PullRequests: React.FC = () => {
  const { data: pulls, isLoading, isError } = useQuery({ queryKey: ['pulls'], queryFn: () => api.get('/api/pulls').then(r => r.data) });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Pull Requests</h1>
      <p className="mt-1 text-sm text-gray-500">Your open pull requests across all repositories</p>
      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
        {isLoading && <p className="p-4 text-gray-500">Loading pull requests...</p>}
        {isError && <p className="p-4 text-red-500">Failed to load pull requests.</p>}
        {pulls?.length === 0 && <p className="p-4 text-gray-400">No open pull requests.</p>}
        {pulls?.map((pr: any) => (
          <div key={pr.id} className="p-4 flex items-start justify-between">
            <div>
              <a href={pr.html_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline">{pr.title}</a>
              <p className="text-xs text-gray-500 mt-1">{pr.repository_url.split('/').slice(-2).join('/')} · #{pr.number}</p>
            </div>
            <span className="text-xs text-gray-400">{new Date(pr.updated_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PullRequests;
