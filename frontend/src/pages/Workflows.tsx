import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const statusColor: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failure: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  queued: 'bg-yellow-100 text-yellow-800',
};

const Workflows: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState('');

  const { data: repos } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get('/api/repos').then(r => r.data),
  });

  const [owner, repo] = selectedRepo.split('/');
  const { data: runs, isLoading } = useQuery({
    queryKey: ['workflows', selectedRepo],
    queryFn: () => api.get(`/api/workflows/${owner}/${repo}`).then(r => r.data),
    enabled: !!selectedRepo,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Workflows</h1>
      <div className="mt-4">
        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={selectedRepo}
          onChange={e => setSelectedRepo(e.target.value)}
        >
          <option value="">Select a repository</option>
          {repos?.map((r: any) => (
            <option key={r.id} value={r.full_name}>{r.full_name}</option>
          ))}
        </select>
      </div>
      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
        {isLoading && <p className="p-4 text-gray-500">Loading workflow runs...</p>}
        {!selectedRepo && <p className="p-4 text-gray-400">Select a repository to view workflows.</p>}
        {runs?.map((run: any) => (
          <div key={run.id} className="p-4 flex items-center justify-between">
            <div>
              <a href={run.html_url} target="_blank" rel="noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline">
                {run.name}
              </a>
              <p className="text-xs text-gray-500 mt-1">
                {run.head_branch} · {run.event} · {new Date(run.updated_at).toLocaleString()}
              </p>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColor[run.conclusion ?? run.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {run.conclusion ?? run.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Workflows;
