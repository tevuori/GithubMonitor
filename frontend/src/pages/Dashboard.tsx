import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get('/api/repos').then(r => r.data),
  });

  const totalRepos = repos?.length ?? '—';
  const openIssues = repos?.reduce((acc: number, r: any) => acc + r.open_issues_count, 0) ?? '—';

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        {user && (
          <div className="flex items-center space-x-2">
            <img className="h-8 w-8 rounded-full" src={user.avatarUrl} alt={user.displayName} />
            <span className="text-sm text-gray-600">Welcome, {user.displayName}</span>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500">Total Repositories</dt>
          <dd className="text-lg font-medium text-gray-900">
            {reposLoading ? 'Loading...' : totalRepos}
          </dd>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500">Open Issues</dt>
          <dd className="text-lg font-medium text-gray-900">
            {reposLoading ? 'Loading...' : openIssues}
          </dd>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <dt className="text-sm font-medium text-gray-500">Public Repos</dt>
          <dd className="text-lg font-medium text-gray-900">
            {reposLoading ? 'Loading...' : repos?.filter((r: any) => !r.private).length ?? '—'}
          </dd>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
