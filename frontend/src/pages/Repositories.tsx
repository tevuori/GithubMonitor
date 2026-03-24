import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const Repositories: React.FC = () => {
  const { data: repos, isLoading, isError } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get('/api/repos').then(r => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Repositories</h1>

      <div className="mt-6 bg-white shadow rounded-lg p-6">
        {isLoading && <p className="text-gray-500">Loading repositories...</p>}
        {isError && <p className="text-red-500">Failed to load repositories.</p>}
        {repos && (
          <div className="divide-y divide-gray-200">
            {repos.map((repo: any) => (
              <div key={repo.id} className="py-4 flex items-center justify-between">
                <div>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {repo.full_name}
                  </a>
                  <p className="text-sm text-gray-500">{repo.description || 'No description'}</p>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {repo.language && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                      {repo.language}
                    </span>
                  )}
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🐛 {repo.open_issues_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Repositories;
