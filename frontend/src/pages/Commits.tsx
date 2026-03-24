import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
  parents: Array<{ sha: string }>;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

const Commits: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');

  const { data: repos } = useQuery({ 
    queryKey: ['repos'], 
    queryFn: () => api.get('/api/repos').then(r => r.data) 
  });

  // Auto-select first repo
  useEffect(() => {
    if (repos?.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0].full_name);
    }
  }, [repos, selectedRepo]);

  const [owner, repo] = selectedRepo.split('/');
  
  const { data: commits, isLoading, error } = useQuery<Commit[]>({
    queryKey: ['commits', selectedRepo],
    queryFn: () => api.get(`/api/commits/${owner}/${repo}`).then(r => r.data),
    enabled: !!selectedRepo,
  });

  // Get unique authors from commits
  const authors = commits 
    ? [...new Set(commits.map(c => c.commit.author.name).filter(Boolean))]
    : [];

  // Filter commits
  const filteredCommits = commits?.filter(c => {
    const matchesSearch = searchTerm === '' || 
      c.commit.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sha.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAuthor = filterAuthor === '' || c.commit.author.name === filterAuthor;
    return matchesSearch && matchesAuthor;
  });

  // Group commits by date
  const groupedCommits = filteredCommits?.reduce((acc, commit) => {
    const date = new Date(commit.commit.author.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(commit);
    return acc;
  }, {} as Record<string, Commit[]>);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6" data-testid="commits-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commits</h1>
          <p className="mt-1 text-sm text-gray-500">Browse commit history for your repositories</p>
        </div>
        <select 
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedRepo} 
          onChange={e => {
            setSelectedRepo(e.target.value);
            setSearchTerm('');
            setFilterAuthor('');
          }}
          data-testid="repo-selector"
        >
          <option value="">Select a repository</option>
          {repos?.map((r: any) => (
            <option key={r.id} value={r.full_name}>{r.full_name}</option>
          ))}
        </select>
      </div>

      {/* Filters */}
      {selectedRepo && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search commits by message or SHA..."
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
            value={filterAuthor}
            onChange={e => setFilterAuthor(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="author-filter"
          >
            <option value="">All authors</option>
            {authors.map(author => (
              <option key={author} value={author}>{author}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats Bar */}
      {commits && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{filteredCommits?.length}</span> commits
              {searchTerm || filterAuthor ? ` (filtered from ${commits.length})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-gray-600">
              <span className="font-semibold text-gray-900">{authors.length}</span> contributors
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white shadow rounded-xl overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading commits...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-500">Failed to load commits</p>
          </div>
        )}

        {!selectedRepo && !isLoading && (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-gray-400">Select a repository to view commits</p>
          </div>
        )}

        {groupedCommits && Object.entries(groupedCommits).map(([date, dateCommits]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 sticky top-0">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">{date}</span>
                <span className="text-xs text-gray-400">({dateCommits.length} commits)</span>
              </div>
            </div>

            {/* Commits for this date */}
            <div className="divide-y divide-gray-100">
              {dateCommits.map((commit) => (
                <div key={commit.sha} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {commit.author?.avatar_url ? (
                      <img 
                        src={commit.author.avatar_url} 
                        alt={commit.commit.author.name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500 font-medium">
                          {commit.commit.author.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <a 
                            href={commit.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                          >
                            {commit.commit.message.split('\n')[0]}
                          </a>
                          {commit.commit.message.split('\n').length > 1 && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {commit.commit.message.split('\n').slice(1).join(' ').trim()}
                            </p>
                          )}
                        </div>
                        <a 
                          href={commit.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 px-2 py-1 font-mono text-xs bg-gray-100 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                        >
                          {commit.sha.slice(0, 7)}
                        </a>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">
                            {commit.author?.login || commit.commit.author.name}
                          </span>
                        </span>
                        <span>{formatTime(commit.commit.author.date)}</span>
                        <span className="text-gray-400">{formatRelativeTime(commit.commit.author.date)}</span>
                        {commit.parents.length > 1 && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            Merge
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredCommits?.length === 0 && !isLoading && selectedRepo && (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-400">No commits match your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Commits;
