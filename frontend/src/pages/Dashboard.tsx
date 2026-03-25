import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get('/api/repos').then(r => r.data),
  });

  const { data: pulls } = useQuery({
    queryKey: ['pulls'],
    queryFn: () => api.get('/api/pulls').then(r => r.data),
  });

  const { data: issues } = useQuery({
    queryKey: ['issues'],
    queryFn: () => api.get('/api/issues').then(r => r.data),
  });

  const totalRepos = repos?.length ?? 0;
  const totalStars = repos?.reduce((acc: number, r: any) => acc + r.stargazers_count, 0) ?? 0;
  const totalForks = repos?.reduce((acc: number, r: any) => acc + r.forks_count, 0) ?? 0;
  const openIssues = repos?.reduce((acc: number, r: any) => acc + r.open_issues_count, 0) ?? 0;
  const publicRepos = repos?.filter((r: any) => !r.private).length ?? 0;
  const privateRepos = repos?.filter((r: any) => r.private).length ?? 0;

  const languages = repos?.reduce((acc: Record<string, number>, r: any) => {
    if (r.language) {
      acc[r.language] = (acc[r.language] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) ?? {};

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentRepos = repos?.slice(0, 5) ?? [];

  const recentActivity = [
    ...(pulls?.slice(0, 3).map((pr: any) => ({
      type: 'pr',
      title: pr.title,
      repo: pr.repository_url?.split('/').slice(-2).join('/'),
      time: pr.updated_at,
      url: pr.html_url,
    })) ?? []),
    ...(issues?.slice(0, 3).map((issue: any) => ({
      type: 'issue',
      title: issue.title,
      repo: issue.repository_url?.split('/').slice(-2).join('/'),
      time: issue.updated_at,
      url: issue.html_url,
    })) ?? []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

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
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
  };

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.displayName}!</h1>
            <p className="mt-1 text-blue-100">Here's what's happening with your repositories</p>
          </div>
          {user && (
            <img 
              className="h-16 w-16 rounded-full ring-4 ring-white/30" 
              src={user.avatarUrl} 
              alt={user.displayName} 
            />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Repositories</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reposLoading ? '...' : totalRepos}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Stars</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reposLoading ? '...' : totalStars.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Forks</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reposLoading ? '...' : totalForks.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Open Issues</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reposLoading ? '...' : openIssues}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Open PRs</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {pulls?.length ?? 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Private</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {reposLoading ? '...' : privateRepos}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Link to="/pull-requests" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No recent activity</div>
            ) : (
              recentActivity.map((activity, i) => (
                <a 
                  key={i} 
                  href={activity.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'pr'
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {activity.type === 'pr' ? (
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.repo}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.time).toLocaleDateString()}
                  </span>
                </a>
              ))
            )}
          </div>
        </div>

        {/* Language Breakdown */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Languages</h2>
          </div>
          <div className="p-6">
            {topLanguages.length === 0 ? (
              <div className="text-center text-muted-foreground">No language data</div>
            ) : (
              <div className="space-y-4">
                {topLanguages.map(([lang, count]) => (
                  <div key={lang}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{lang}</span>
                      <span className="text-muted-foreground">{count} repos</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(count / totalRepos) * 100}%`,
                          backgroundColor: languageColors[lang] || '#6b7280'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Repositories */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Repositories</h2>
          <Link to="/repositories" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-border">
          {recentRepos.map((repo: any) => (
            <div key={repo.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                  >
                    {repo.name}
                  </a>
                  {repo.private && (
                    <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">Private</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {repo.description || 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-4 ml-4">
                {repo.language && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: languageColors[repo.language] || '#6b7280' }}
                    />
                    {repo.language}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">⭐ {repo.stargazers_count}</span>
                <span className="text-sm text-muted-foreground">🍴 {repo.forks_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/search" className="bg-card rounded-xl shadow-sm border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="font-medium text-foreground">Code Search</span>
          </div>
        </Link>
        <Link to="/files" className="bg-card rounded-xl shadow-sm border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="font-medium text-foreground">File Browser</span>
          </div>
        </Link>
        <Link to="/traffic" className="bg-card rounded-xl shadow-sm border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-medium text-foreground">Traffic</span>
          </div>
        </Link>
        <Link to="/organization" className="bg-card rounded-xl shadow-sm border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="font-medium text-foreground">Organization</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
