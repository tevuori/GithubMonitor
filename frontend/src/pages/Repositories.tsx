import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  pushed_at: string;
  updated_at: string;
  created_at: string;
  default_branch: string;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

type SortOption = 'updated' | 'stars' | 'forks' | 'name' | 'created';
type FilterOption = 'all' | 'public' | 'private' | 'fork' | 'source';

const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#239120',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Dart: '#00B4AB',
};

const Repositories: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { data: repos, isLoading, isError } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: () => api.get('/api/repos').then(r => r.data),
  });

  // Get unique languages
  const languages = useMemo(() => {
    if (!repos) return [];
    const langs = [...new Set(repos.map(r => r.language).filter(Boolean) as string[])];
    return langs.sort();
  }, [repos]);

  // Filter and sort repos
  const filteredRepos = useMemo(() => {
    if (!repos) return [];

    let result = repos.filter(repo => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.topics?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type filter
      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'public' && !repo.private) ||
        (filterBy === 'private' && repo.private) ||
        (filterBy === 'fork' && repo.fork) ||
        (filterBy === 'source' && !repo.fork);

      // Language filter
      const matchesLanguage = filterLanguage === '' || repo.language === filterLanguage;

      return matchesSearch && matchesFilter && matchesLanguage;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'stars':
          return b.stargazers_count - a.stargazers_count;
        case 'forks':
          return b.forks_count - a.forks_count;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
        default:
          return new Date(b.pushed_at || b.updated_at).getTime() - new Date(a.pushed_at || a.updated_at).getTime();
      }
    });

    return result;
  }, [repos, searchTerm, sortBy, filterBy, filterLanguage]);

  // Stats
  const stats = useMemo(() => {
    if (!repos) return { total: 0, public: 0, private: 0, forks: 0, stars: 0 };
    return {
      total: repos.length,
      public: repos.filter(r => !r.private).length,
      private: repos.filter(r => r.private).length,
      forks: repos.filter(r => r.fork).length,
      stars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
    };
  }, [repos]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6" data-testid="repositories-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="mt-1 text-sm text-gray-500">
            {stats.total} repositories · {stats.stars.toLocaleString()} total stars
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => setFilterBy('all')}
          className={`p-4 rounded-xl border transition-all ${filterBy === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">All Repos</div>
        </button>
        <button
          onClick={() => setFilterBy('public')}
          className={`p-4 rounded-xl border transition-all ${filterBy === 'public' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="text-2xl font-bold text-green-600">{stats.public}</div>
          <div className="text-sm text-gray-500">Public</div>
        </button>
        <button
          onClick={() => setFilterBy('private')}
          className={`p-4 rounded-xl border transition-all ${filterBy === 'private' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="text-2xl font-bold text-orange-600">{stats.private}</div>
          <div className="text-sm text-gray-500">Private</div>
        </button>
        <button
          onClick={() => setFilterBy('fork')}
          className={`p-4 rounded-xl border transition-all ${filterBy === 'fork' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="text-2xl font-bold text-purple-600">{stats.forks}</div>
          <div className="text-sm text-gray-500">Forks</div>
        </button>
        <button
          onClick={() => setFilterBy('source')}
          className={`p-4 rounded-xl border transition-all ${filterBy === 'source' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className="text-2xl font-bold text-blue-600">{stats.total - stats.forks}</div>
          <div className="text-sm text-gray-500">Sources</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="search-input"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterLanguage}
          onChange={e => setFilterLanguage(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="language-filter"
        >
          <option value="">All languages</option>
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="sort-select"
        >
          <option value="updated">Recently updated</option>
          <option value="stars">Most stars</option>
          <option value="forks">Most forks</option>
          <option value="name">Name</option>
          <option value="created">Newest</option>
        </select>
      </div>

      {/* Results count */}
      {searchTerm || filterLanguage || filterBy !== 'all' ? (
        <div className="text-sm text-gray-500">
          Showing {filteredRepos.length} of {repos?.length} repositories
          {searchTerm && <span> matching "{searchTerm}"</span>}
        </div>
      ) : null}

      {/* Content */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading repositories...</p>
        </div>
      )}

      {isError && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-500">Failed to load repositories</p>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredRepos.map(repo => (
              <div key={repo.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-lg font-semibold text-blue-600 hover:underline"
                      >
                        {repo.name}
                      </a>
                      {repo.private && (
                        <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">Private</span>
                      )}
                      {repo.fork && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">Fork</span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-gray-600 line-clamp-2">{repo.description}</p>
                    )}
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {repo.topics.slice(0, 5).map(topic => (
                          <span key={topic} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            {topic}
                          </span>
                        ))}
                        {repo.topics.length > 5 && (
                          <span className="text-xs text-gray-400">+{repo.topics.length - 5} more</span>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: languageColors[repo.language] || '#6b7280' }}
                          />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {repo.stargazers_count.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        {repo.forks_count.toLocaleString()}
                      </span>
                      <span>Updated {formatDate(repo.pushed_at || repo.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link
                      to={`/files?repo=${repo.full_name}`}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
                    >
                      Browse Files
                    </Link>
                    <Link
                      to={`/branches?repo=${repo.full_name}`}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
                    >
                      Git Graph
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRepos.length === 0 && (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-400">No repositories match your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.map(repo => (
            <div key={repo.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:underline truncate"
                >
                  {repo.name}
                </a>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {repo.private && (
                    <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Private</span>
                  )}
                  {repo.fork && (
                    <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Fork</span>
                  )}
                </div>
              </div>
              {repo.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{repo.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-3">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: languageColors[repo.language] || '#6b7280' }}
                      />
                      {repo.language}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🍴 {repo.forks_count}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredRepos.length === 0 && (
            <div className="col-span-full p-8 text-center bg-white rounded-xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-400">No repositories match your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Repositories;
