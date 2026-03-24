import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface SearchResult {
  name: string;
  path: string;
  sha: string;
  html_url: string;
  repository: {
    full_name: string;
    html_url: string;
  };
  text_matches?: Array<{
    fragment: string;
    matches: Array<{ text: string; indices: number[] }>;
  }>;
}

const CodeSearch = () => {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'code' | 'repos'>('code');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', searchType, searchTerm],
    queryFn: async () => {
      if (!searchTerm) return null;
      const res = await api.get(`/api/search/${searchType}`, { params: { q: searchTerm } });
      return res.data;
    },
    enabled: !!searchTerm,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  const highlightCode = (fragment: string) => {
    return fragment.split('\n').map((line, i) => (
      <div key={i} className="hover:bg-yellow-50">
        <span className="select-none text-gray-400 pr-4">{i + 1}</span>
        {line}
      </div>
    ));
  };

  return (
    <div className="space-y-6" data-testid="code-search-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Code Search</h1>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search code across your repositories..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="search-input"
              />
              <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'code' | 'repos')}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="code">Code</option>
            <option value="repos">Repositories</option>
          </select>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          <p>Tips: Use qualifiers like <code className="bg-gray-100 px-1 rounded">repo:owner/name</code>, <code className="bg-gray-100 px-1 rounded">language:javascript</code>, <code className="bg-gray-100 px-1 rounded">extension:tsx</code></p>
        </div>
      </form>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-600">
          Failed to search. Please try again.
        </div>
      )}

      {data && searchType === 'code' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Found {data.total_count?.toLocaleString() || 0} code results
          </p>
          {data.items?.map((item: SearchResult) => (
            <div key={item.sha} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <a
                    href={item.repository.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {item.repository.full_name}
                  </a>
                  <span className="mx-2 text-gray-400">/</span>
                  <a
                    href={item.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {item.path}
                  </a>
                </div>
                <a
                  href={item.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  View file →
                </a>
              </div>
              {item.text_matches?.map((match, i) => (
                <div key={i} className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <pre className="text-sm font-mono overflow-x-auto">
                    {highlightCode(match.fragment)}
                  </pre>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {data && searchType === 'repos' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Found {data.total_count?.toLocaleString() || 0} repositories
          </p>
          <div className="grid gap-4">
            {data.items?.map((repo: any) => (
              <div key={repo.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-lg font-semibold text-blue-600 hover:underline"
                    >
                      {repo.full_name}
                    </a>
                    {repo.description && (
                      <p className="mt-1 text-gray-600">{repo.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          {repo.language}
                        </span>
                      )}
                      <span>⭐ {repo.stargazers_count?.toLocaleString()}</span>
                      <span>🍴 {repo.forks_count?.toLocaleString()}</span>
                      <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !data && searchTerm && (
        <div className="text-center py-12 text-gray-500">
          No results found for "{searchTerm}"
        </div>
      )}

      {!searchTerm && (
        <div className="text-center py-12 text-gray-500">
          Enter a search query to find code or repositories
        </div>
      )}
    </div>
  );
};

export default CodeSearch;
