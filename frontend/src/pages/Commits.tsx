import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const Commits: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState('');
  const { data: repos } = useQuery({ queryKey: ['repos'], queryFn: () => api.get('/api/repos').then(r => r.data) });
  const [owner, repo] = selectedRepo.split('/');
  const { data: commits, isLoading } = useQuery({
    queryKey: ['commits', selectedRepo],
    queryFn: () => api.get(`/api/commits/${owner}/${repo}`).then(r => r.data),
    enabled: !!selectedRepo,
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Commits</h1>
      <div className="mt-4">
        <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}>
          <option value="">Select a repository</option>
          {repos?.map((r: any) => <option key={r.id} value={r.full_name}>{r.full_name}</option>)}
        </select>
      </div>
      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
        {isLoading && <p className="p-4 text-gray-500">Loading commits...</p>}
        {!selectedRepo && <p className="p-4 text-gray-400">Select a repository to view commits.</p>}
        {commits?.map((c: any) => (
          <div key={c.sha} className="p-4 flex items-start space-x-3">
            <img src={c.author?.avatar_url} className="h-8 w-8 rounded-full mt-1" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.commit.message.split('\n')[0]}</p>
              <p className="text-xs text-gray-500">{c.commit.author.name} · {new Date(c.commit.author.date).toLocaleDateString()}</p>
            </div>
            <a href={c.html_url} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-600 hover:underline">{c.sha.slice(0, 7)}</a>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Commits;
