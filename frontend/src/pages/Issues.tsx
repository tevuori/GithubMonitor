import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const Issues: React.FC = () => {
  const { data: issues, isLoading, isError } = useQuery({ queryKey: ['issues'], queryFn: () => api.get('/api/issues').then(r => r.data) });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Issues</h1>
      <p className="mt-1 text-sm text-gray-500">Your open issues across all repositories</p>
      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
        {isLoading && <p className="p-4 text-gray-500">Loading issues...</p>}
        {isError && <p className="p-4 text-red-500">Failed to load issues.</p>}
        {issues?.length === 0 && <p className="p-4 text-gray-400">No open issues.</p>}
        {issues?.map((issue: any) => (
          <div key={issue.id} className="p-4 flex items-start justify-between">
            <div>
              <a href={issue.html_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline">{issue.title}</a>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">{issue.repository_url.split('/').slice(-2).join('/')} · #{issue.number}</p>
                {issue.labels?.map((label: any) => (
                  <span key={label.id} className="px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: `#${label.color}22`, color: `#${label.color}` }}>{label.name}</span>
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-400">{new Date(issue.updated_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Issues;
