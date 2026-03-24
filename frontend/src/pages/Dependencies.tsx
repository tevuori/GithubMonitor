import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface Ecosystem {
  name: string;
  count: number;
  dependencies: Array<{
    name: string;
    version: string;
    license: string;
  }>;
}

interface DependencyData {
  name: string;
  createdAt: string;
  packages: number;
  ecosystems: Ecosystem[];
}

const ECOSYSTEM_COLORS: Record<string, string> = {
  npm: 'bg-red-500',
  pip: 'bg-blue-500',
  maven: 'bg-orange-500',
  nuget: 'bg-purple-500',
  rubygems: 'bg-red-600',
  cargo: 'bg-amber-600',
  go: 'bg-cyan-500',
  composer: 'bg-indigo-500',
  unknown: 'bg-gray-500',
};

const ECOSYSTEM_ICONS: Record<string, string> = {
  npm: '📦',
  pip: '🐍',
  maven: '☕',
  nuget: '🟣',
  rubygems: '💎',
  cargo: '🦀',
  go: '🔵',
  composer: '🎼',
  unknown: '📁',
};

const Dependencies = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [expandedEcosystem, setExpandedEcosystem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch repos
  const { data: repos, isLoading: reposLoading } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await api.get('/api/repos');
      return res.data;
    },
  });

  // Auto-select first repo
  useEffect(() => {
    if (repos && repos.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0]);
    }
  }, [repos, selectedRepo]);

  // Fetch dependencies
  const { data: dependencies, isLoading: depsLoading } = useQuery<DependencyData>({
    queryKey: ['dependencies', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) throw new Error('No repo');
      const res = await api.get(`/api/dependencies/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  const filteredEcosystems = dependencies?.ecosystems?.map((eco) => ({
    ...eco,
    dependencies: eco.dependencies.filter((dep) =>
      dep.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((eco) => searchTerm === '' || eco.dependencies.length > 0) || [];

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dependencies-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dependencies-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dependency Graph</h1>
      </div>

      {/* Repository selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Repository</label>
            <select
              data-testid="deps-repo-selector"
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={selectedRepo?.full_name || ''}
              onChange={(e) => {
                const repo = repos?.find(r => r.full_name === e.target.value);
                setSelectedRepo(repo || null);
                setExpandedEcosystem(null);
              }}
            >
              {repos?.map((repo) => (
                <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Dependencies</label>
            <input
              type="text"
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {dependencies && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Packages</div>
            <div className="text-3xl font-bold text-gray-900">{dependencies.packages}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Ecosystems</div>
            <div className="text-3xl font-bold text-blue-600">{dependencies.ecosystems?.length || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">SBOM Generated</div>
            <div className="text-sm font-medium text-gray-700">
              {dependencies.createdAt ? new Date(dependencies.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Dependencies by Ecosystem */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Dependencies by Ecosystem</h2>
        </div>
        {depsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading dependency graph...</p>
          </div>
        ) : filteredEcosystems.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredEcosystems.map((ecosystem) => (
              <div key={ecosystem.name}>
                <button
                  onClick={() => setExpandedEcosystem(
                    expandedEcosystem === ecosystem.name ? null : ecosystem.name
                  )}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ECOSYSTEM_ICONS[ecosystem.name] || ECOSYSTEM_ICONS.unknown}</span>
                    <div>
                      <span className="font-medium text-gray-900 capitalize">{ecosystem.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({ecosystem.dependencies.length} packages)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-24 h-2 rounded-full bg-gray-200 overflow-hidden`}>
                      <div
                        className={`h-full ${ECOSYSTEM_COLORS[ecosystem.name] || ECOSYSTEM_COLORS.unknown}`}
                        style={{ width: `${Math.min(100, (ecosystem.count / (dependencies?.packages || 1)) * 100)}%` }}
                      />
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedEcosystem === ecosystem.name ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedEcosystem === ecosystem.name && (
                  <div className="px-4 pb-4">
                    <div className="bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Package</th>
                            <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Version</th>
                            <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">License</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ecosystem.dependencies.map((dep, idx) => (
                            <tr key={`${dep.name}-${idx}`} className="hover:bg-gray-100">
                              <td className="px-4 py-2 text-sm font-mono text-gray-900">{dep.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{dep.version || '-'}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{dep.license || 'Unknown'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700">No dependencies found</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm ? 'No packages match your search.' : 'Dependency graph is not available for this repository.'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Make sure the repository has a supported manifest file (package.json, requirements.txt, etc.)
            </p>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">About the Dependency Graph</p>
            <p className="mt-1">
              The dependency graph is generated from your repository's SBOM (Software Bill of Materials).
              Enable the dependency graph in your repository settings to see this data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dependencies;
