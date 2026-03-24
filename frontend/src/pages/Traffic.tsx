import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface TrafficData {
  views: { count: number; uniques: number; views: Array<{ timestamp: string; count: number; uniques: number }> };
  clones: { count: number; uniques: number; clones: Array<{ timestamp: string; count: number; uniques: number }> };
  referrers: Array<{ referrer: string; count: number; uniques: number }>;
  paths: Array<{ path: string; title: string; count: number; uniques: number }>;
}

const Traffic = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const { data: repos } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await api.get('/api/repos');
      return res.data;
    },
  });

  useEffect(() => {
    if (repos && repos.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0]);
    }
  }, [repos, selectedRepo]);

  const { data: traffic, isLoading, error } = useQuery<TrafficData>({
    queryKey: ['traffic', selectedRepo?.full_name],
    queryFn: async () => {
      if (!selectedRepo) throw new Error('No repo selected');
      const res = await api.get(`/api/traffic/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const maxViews = Math.max(...(traffic?.views.views.map(v => v.count) || [1]));
  const maxClones = Math.max(...(traffic?.clones.clones.map(c => c.count) || [1]));

  return (
    <div className="space-y-6" data-testid="traffic-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Repository Traffic</h1>
        <select
          value={selectedRepo?.full_name || ''}
          onChange={(e) => {
            const repo = repos?.find(r => r.full_name === e.target.value);
            setSelectedRepo(repo || null);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="repo-selector"
        >
          {repos?.map((repo) => (
            <option key={repo.id} value={repo.full_name}>
              {repo.full_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-700">Traffic data requires push access to the repository</p>
        </div>
      )}

      {traffic && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 font-medium">Total Views</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{traffic.views.count.toLocaleString()}</div>
              <div className="text-sm text-gray-500">{traffic.views.uniques} unique visitors</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 font-medium">Total Clones</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{traffic.clones.count.toLocaleString()}</div>
              <div className="text-sm text-gray-500">{traffic.clones.uniques} unique cloners</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 font-medium">Top Referrer</div>
              <div className="mt-2 text-xl font-bold text-gray-900 truncate">
                {traffic.referrers[0]?.referrer || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                {traffic.referrers[0]?.count || 0} visits
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 font-medium">Popular Page</div>
              <div className="mt-2 text-xl font-bold text-gray-900 truncate">
                {traffic.paths[0]?.path || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                {traffic.paths[0]?.count || 0} views
              </div>
            </div>
          </div>

          {/* Views Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Views (Last 14 Days)</h2>
            <div className="h-48 flex items-end gap-2">
              {traffic.views.views.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: `${(day.count / maxViews) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    title={`${day.count} views (${day.uniques} unique)`}
                  />
                  <div className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                    {formatDate(day.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clones Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Clones (Last 14 Days)</h2>
            <div className="h-48 flex items-end gap-2">
              {traffic.clones.clones.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                    style={{ height: `${(day.count / maxClones) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    title={`${day.count} clones (${day.uniques} unique)`}
                  />
                  <div className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                    {formatDate(day.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Referrers & Popular Paths */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Referrers */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Top Referrers</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {traffic.referrers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No referrer data available</div>
                ) : (
                  traffic.referrers.map((ref, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{ref.referrer}</div>
                        <div className="text-sm text-gray-500">{ref.uniques} unique visitors</div>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{ref.count}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Popular Paths */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Popular Content</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {traffic.paths.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No path data available</div>
                ) : (
                  traffic.paths.map((path, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 font-mono text-sm">{path.path}</div>
                        <div className="text-sm text-gray-500">{path.title || 'No title'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">{path.count}</div>
                        <div className="text-sm text-gray-500">{path.uniques} unique</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Traffic;
