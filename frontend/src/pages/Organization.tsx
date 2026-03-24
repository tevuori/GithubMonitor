import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Org {
  id: number;
  login: string;
  avatar_url: string;
  description: string;
}

interface OrgDetails {
  login: string;
  name: string;
  avatar_url: string;
  description: string;
  html_url: string;
  blog: string;
  location: string;
  email: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface Member {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
}

interface Team {
  id: number;
  name: string;
  slug: string;
  description: string;
  privacy: string;
  html_url: string;
  members_count?: number;
  repos_count?: number;
}

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  private: boolean;
}

const Organization = () => {
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'teams' | 'repos'>('overview');

  // Get user's orgs
  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ['orgs'],
    queryFn: async () => {
      const res = await api.get('/api/orgs');
      return res.data;
    },
  });

  useEffect(() => {
    if (orgs && orgs.length > 0 && !selectedOrg) {
      setSelectedOrg(orgs[0]);
    }
  }, [orgs, selectedOrg]);

  // Get org dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<{
    details: OrgDetails;
    members: Member[];
    teams: Team[];
    repos: Repo[];
  }>({
    queryKey: ['orgDashboard', selectedOrg?.login],
    queryFn: async () => {
      if (!selectedOrg) throw new Error('No org selected');
      const res = await api.get(`/api/orgs/${selectedOrg.login}/dashboard`);
      return res.data;
    },
    enabled: !!selectedOrg,
  });

  if (orgsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!orgs || orgs.length === 0) {
    return (
      <div className="text-center py-12" data-testid="no-orgs">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organizations</h2>
        <p className="text-gray-500">You're not a member of any GitHub organizations yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="organization-page">
      {/* Org Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organization Dashboard</h1>
        <select
          value={selectedOrg?.login || ''}
          onChange={(e) => {
            const org = orgs?.find(o => o.login === e.target.value);
            setSelectedOrg(org || null);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="org-selector"
        >
          {orgs?.map((org) => (
            <option key={org.id} value={org.login}>
              {org.login}
            </option>
          ))}
        </select>
      </div>

      {dashboardLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {dashboard && (
        <>
          {/* Org Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start gap-6">
              <img
                src={dashboard.details.avatar_url}
                alt={dashboard.details.login}
                className="w-20 h-20 rounded-lg"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {dashboard.details.name || dashboard.details.login}
                  </h2>
                  <a
                    href={dashboard.details.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    @{dashboard.details.login}
                  </a>
                </div>
                {dashboard.details.description && (
                  <p className="mt-2 text-gray-600">{dashboard.details.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                  {dashboard.details.location && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {dashboard.details.location}
                    </span>
                  )}
                  {dashboard.details.blog && (
                    <a href={dashboard.details.blog} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {dashboard.details.blog}
                    </a>
                  )}
                  {dashboard.details.email && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {dashboard.details.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{dashboard.details.public_repos}</div>
                <div className="text-sm text-gray-500">Repositories</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{dashboard.members.length}</div>
                <div className="text-sm text-gray-500">Members</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{dashboard.teams.length}</div>
                <div className="text-sm text-gray-500">Teams</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{dashboard.details.followers}</div>
                <div className="text-sm text-gray-500">Followers</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-4">
              {(['overview', 'members', 'teams', 'repos'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Repos */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 font-semibold text-gray-900">
                  Recent Repositories
                </div>
                <div className="divide-y divide-gray-100">
                  {dashboard.repos.slice(0, 5).map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-blue-600">{repo.name}</div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {repo.language && <span>{repo.language}</span>}
                          <span>⭐ {repo.stargazers_count}</span>
                        </div>
                      </div>
                      {repo.description && (
                        <div className="text-sm text-gray-500 mt-1 truncate">{repo.description}</div>
                      )}
                    </a>
                  ))}
                </div>
              </div>

              {/* Team List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 font-semibold text-gray-900">
                  Teams
                </div>
                <div className="divide-y divide-gray-100">
                  {dashboard.teams.slice(0, 5).map((team) => (
                    <a
                      key={team.id}
                      href={team.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900">{team.name}</div>
                      {team.description && (
                        <div className="text-sm text-gray-500 mt-1">{team.description}</div>
                      )}
                    </a>
                  ))}
                  {dashboard.teams.length === 0 && (
                    <div className="px-6 py-4 text-gray-500 text-center">No teams found</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                {dashboard.members.map((member) => (
                  <a
                    key={member.id}
                    href={member.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <img src={member.avatar_url} alt={member.login} className="w-10 h-10 rounded-full" />
                    <span className="font-medium text-gray-900 truncate">{member.login}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.teams.map((team) => (
                <a
                  key={team.id}
                  href={team.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">{team.name}</div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      team.privacy === 'secret' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {team.privacy}
                    </span>
                  </div>
                  {team.description && (
                    <p className="mt-2 text-sm text-gray-500">{team.description}</p>
                  )}
                </a>
              ))}
              {dashboard.teams.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No teams found in this organization
                </div>
              )}
            </div>
          )}

          {activeTab === 'repos' && (
            <div className="space-y-4">
              {dashboard.repos.map((repo) => (
                <div key={repo.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-lg font-semibold text-blue-600 hover:underline"
                        >
                          {repo.name}
                        </a>
                        {repo.private && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">Private</span>
                        )}
                      </div>
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
                        <span>⭐ {repo.stargazers_count}</span>
                        <span>🍴 {repo.forks_count}</span>
                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Organization;
