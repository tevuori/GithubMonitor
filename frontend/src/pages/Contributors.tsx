import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const Contributors: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState('');
  const { data: repos } = useQuery({ queryKey: ['repos'], queryFn: () => api.get('/api/repos').then(r => r.data) });
  const [owner, repo] = selectedRepo.split('/');
  const { data: contributors, isLoading, isError } = useQuery({
    queryKey: ['contributors', selectedRepo],
    queryFn: () => api.get(`/api/stats/contributors/${owner}/${repo}`).then(r => r.data),
    enabled: !!selectedRepo,
  });

  const maxCommits = contributors?.[0]?.totalCommits ?? 1;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Contributor Statistics</h1>
      <p className="mt-1 text-sm text-gray-500">Commit activity broken down by contributor</p>
      <div className="mt-4">
        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={selectedRepo}
          onChange={e => setSelectedRepo(e.target.value)}
        >
          <option value="">Select a repository</option>
          {repos?.map((r: any) => <option key={r.id} value={r.full_name}>{r.full_name}</option>)}
        </select>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
        {isLoading && <p className="p-4 text-gray-500">Loading contributor stats... (may take a few seconds)</p>}
        {isError && <p className="p-4 text-red-500">Failed to load stats.</p>}
        {!selectedRepo && <p className="p-4 text-gray-400">Select a repository to view contributor statistics.</p>}
        {contributors?.length === 0 && <p className="p-4 text-gray-400">No contributor data available.</p>}
        {contributors?.map((c: any, i: number) => (
          <div key={c.login} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-400 w-5">#{i + 1}</span>
                <img src={c.avatarUrl} className="h-8 w-8 rounded-full" alt={c.login} />
                <a href={c.profileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                  {c.login}
                </a>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="font-semibold text-gray-900">{c.totalCommits} commits</span>
                <span className="text-green-600">+{c.additions.toLocaleString()}</span>
                <span className="text-red-500">-{c.deletions.toLocaleString()}</span>
              </div>
            </div>
            {/* Commit share bar */}
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(c.totalCommits / maxCommits) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Contributors;
