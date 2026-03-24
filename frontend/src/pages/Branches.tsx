import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const Branches: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState('');
  const { data: repos } = useQuery({ queryKey: ['repos'], queryFn: () => api.get('/api/repos').then(r => r.data) });
  const [owner, repo] = selectedRepo.split('/');
  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', selectedRepo],
    queryFn: () => api.get(`/api/branches/${owner}/${repo}`).then(r => r.data),
    enabled: !!selectedRepo,
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Branches</h1>
      <div className="mt-4">
        <select className="border border-gray-300 rounded-md px-3 py-2 text-sm" value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}>
          <option value="">Select a repository</option>
          {repos?.map((r: any) => <option key={r.id} value={r.full_name}>{r.full_name}</option>)}
        </select>
      </div>
      <div className="mt-6 bg-white shadow rounded-lg divide-y divide-gray-200">
        {isLoading && <p className="p-4 text-gray-500">Loading branches...</p>}
        {!selectedRepo && <p className="p-4 text-gray-400">Select a repository to view branches.</p>}
        {branches?.map((b: any) => (
          <div key={b.name} className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{b.name}</span>
            <div className="flex items-center space-x-2">
              {b.protected && <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">protected</span>}
              <span className="text-xs font-mono text-gray-400">{b.commit.sha.slice(0, 7)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Branches;
