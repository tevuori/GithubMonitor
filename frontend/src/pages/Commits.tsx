import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
}

interface CommitDetails {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
  };
  author: { login: string; avatar_url: string; html_url: string } | null;
  parents: Array<{ sha: string; html_url: string }>;
  stats: { additions: number; deletions: number; total: number };
  files: Array<{
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    blob_url: string;
  }>;
}

const Commits: React.FC = () => {
  const [searchParams] = useSearchParams();
  const paramRepo = searchParams.get('repo') || '';
  const paramSha  = searchParams.get('sha')  || '';

  const [selectedRepo, setSelectedRepo] = useState(paramRepo);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAuthor, setFilterAuthor] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<string | null>(paramSha || null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { data: repos } = useQuery({ 
    queryKey: ['repos'], 
    queryFn: () => api.get('/api/repos').then(r => r.data) 
  });

  // Auto-select first repo only when no param given
  useEffect(() => {
    if (repos?.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0].full_name);
    }
  }, [repos, selectedRepo]);

  // When repos load and paramRepo is set, make sure it is selected
  useEffect(() => {
    if (paramRepo && repos?.length > 0) {
      setSelectedRepo(paramRepo);
    }
  }, [paramRepo, repos]);

  // When commits load and paramSha is set, select it automatically
  const [owner, repo] = selectedRepo.split('/');
  
  const { data: commits, isLoading, error } = useQuery<Commit[]>({
    queryKey: ['commits', selectedRepo],
    queryFn: () => api.get(`/api/commits/${owner}/${repo}`).then(r => r.data),
    enabled: !!selectedRepo,
  });

  useEffect(() => {
    if (paramSha && commits?.length) {
      setSelectedCommit(paramSha);
    }
  }, [paramSha, commits]);

  // Fetch commit details when selected
  const { data: commitDetails, isLoading: detailsLoading } = useQuery<CommitDetails>({
    queryKey: ['commitDetails', owner, repo, selectedCommit],
    queryFn: () => api.get(`/api/commits/${owner}/${repo}/${selectedCommit}`).then(r => r.data),
    enabled: !!selectedCommit && !!owner && !!repo,
  });

  const authors = commits 
    ? [...new Set(commits.map(c => c.commit.author.name).filter(Boolean))]
    : [];

  const filteredCommits = commits?.filter(c => {
    const matchesSearch = searchTerm === '' || 
      c.commit.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sha.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAuthor = filterAuthor === '' || c.commit.author.name === filterAuthor;
    return matchesSearch && matchesAuthor;
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'removed': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'modified': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
      case 'renamed': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const toggleFile = (filename: string) => {
    const newSet = new Set(expandedFiles);
    if (newSet.has(filename)) {
      newSet.delete(filename);
    } else {
      newSet.add(filename);
    }
    setExpandedFiles(newSet);
  };

  const renderDiff = (patch: string | undefined) => {
    if (!patch) return <div className="p-4 text-gray-500 dark:text-gray-400 text-sm">Binary file or no diff available</div>;

    const lines = patch.split('\n');
    return (
      <div className="font-mono text-xs overflow-x-auto">
        {lines.map((line, idx) => {
          let cls = 'bg-background text-foreground';
          if (line.startsWith('+') && !line.startsWith('+++')) {
            cls = 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            cls = 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
          } else if (line.startsWith('@@')) {
            cls = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
          }
          return (
            <div key={idx} className={`${cls} px-4 py-0.5 whitespace-pre`}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="commits-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse commit history for your repositories</p>
        </div>
        <select 
          className="px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={selectedRepo} 
          onChange={e => {
            setSelectedRepo(e.target.value);
            setSearchTerm('');
            setFilterAuthor('');
            setSelectedCommit(null);
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
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="search-input"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={filterAuthor}
            onChange={e => setFilterAuthor(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredCommits?.length}</span> commits
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{authors.length}</span> contributors
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Commits List */}
        <div className={`bg-card shadow rounded-xl overflow-hidden border border-border ${
          selectedCommit ? 'w-1/2' : 'w-full'
        }`}>
          {isLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading commits...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <p className="text-destructive">Failed to load commits</p>
            </div>
          )}

          {!selectedRepo && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Select a repository to view commits</p>
            </div>
          )}

          {groupedCommits && Object.entries(groupedCommits).map(([date, dateCommits]) => (
            <div key={date}>
              <div className="px-4 py-2 bg-muted border-b border-border sticky top-0">
                <span className="text-sm font-medium text-foreground">{date}</span>
                <span className="text-xs text-muted-foreground ml-2">({dateCommits.length})</span>
              </div>

              <div className="divide-y divide-border">
                {dateCommits.map((commit) => (
                  <div 
                    key={commit.sha} 
                    className={`px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedCommit === commit.sha ? 'bg-blue-50 dark:bg-blue-500/10 border-l-2 border-l-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedCommit(selectedCommit === commit.sha ? null : commit.sha);
                      setExpandedFiles(new Set());
                    }}
                    data-testid={`commit-${commit.sha.slice(0, 7)}`}
                  >
                    <div className="flex items-start gap-3">
                      {commit.author?.avatar_url ? (
                        <img 
                          src={commit.author.avatar_url} 
                          alt={commit.commit.author.name}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-muted-foreground text-xs font-medium">
                            {commit.commit.author.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {commit.commit.message.split('\n')[0]}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">{commit.author?.login || commit.commit.author.name}</span>
                          <span>·</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">{commit.sha.slice(0, 7)}</span>
                          <span>·</span>
                          <span>{formatRelativeTime(commit.commit.author.date)}</span>
                          {commit.parents.length > 1 && (
                            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">Merge</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Commit Details Panel */}
        {selectedCommit && (
          <div className="w-1/2 bg-card shadow rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Commit Details</h2>
              <button
                onClick={() => setSelectedCommit(null)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : commitDetails ? (
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {/* Commit Info */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-start gap-3">
                    {commitDetails.author?.avatar_url && (
                      <img src={commitDetails.author.avatar_url} className="w-10 h-10 rounded-full" alt="" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{commitDetails.commit.message.split('\n')[0]}</p>
                      {commitDetails.commit.message.includes('\n') && (
                        <pre className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                          {commitDetails.commit.message.split('\n').slice(1).join('\n').trim()}
                        </pre>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{commitDetails.author?.login || commitDetails.commit.author.name}</span>
                        <span>committed {formatRelativeTime(commitDetails.commit.author.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
                    <span className="font-mono text-xs bg-muted text-muted-foreground px-2 py-1 rounded">{commitDetails.sha.slice(0, 7)}</span>
                    <span className="text-green-600 dark:text-green-400">+{commitDetails.stats?.additions || 0}</span>
                    <span className="text-red-600 dark:text-red-400">-{commitDetails.stats?.deletions || 0}</span>
                    <span className="text-muted-foreground">{commitDetails.files?.length || 0} files</span>
                    <a
                      href={commitDetails.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline ml-auto"
                    >
                      View on GitHub
                    </a>
                  </div>
                </div>

                {/* Files */}
                <div>
                  <div className="px-4 py-2 bg-muted border-b border-border text-sm font-medium text-foreground">
                    Changed Files ({commitDetails.files?.length || 0})
                  </div>
                  <div className="divide-y divide-border">
                    {commitDetails.files?.map((file) => (
                      <div key={file.filename}>
                        <div
                          className="px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleFile(file.filename)}
                        >
                          <svg
                            className={`w-4 h-4 text-muted-foreground transition-transform ${expandedFiles.has(file.filename) ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(file.status)}`}>
                            {file.status}
                          </span>
                          <span className="flex-1 font-mono text-sm text-foreground truncate">{file.filename}</span>
                          <span className="text-xs text-green-600 dark:text-green-400">+{file.additions}</span>
                          <span className="text-xs text-red-600 dark:text-red-400">-{file.deletions}</span>
                        </div>
                        {expandedFiles.has(file.filename) && (
                          <div className="border-t border-border bg-muted/30">
                            {renderDiff(file.patch)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Commits;
