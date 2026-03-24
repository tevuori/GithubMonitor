import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  html_url: string;
  bio: string;
  company: string;
  location: string;
  blog: string;
  twitter_username: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  private_gists: number;
  total_private_repos: number;
  owned_private_repos: number;
  disk_usage: number;
  two_factor_authentication: boolean;
  plan?: {
    name: string;
    space: number;
    collaborators: number;
    private_repos: number;
  };
}

interface RateLimit {
  resources: {
    core: { limit: number; remaining: number; reset: string; used: number };
    search: { limit: number; remaining: number; reset: string; used: number };
    graphql: { limit: number; remaining: number; reset: string; used: number };
  };
  rate: { limit: number; remaining: number; reset: string; used: number };
}

interface UserActivity {
  total: number;
  byType: Array<{ type: string; count: number }>;
  byDay: Array<{ day: string; count: number }>;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const Profile = () => {
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'rate-limit' | 'preferences'>('profile');

  // Preferences state (stored in localStorage)
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('github-monitor-prefs');
    return saved ? JSON.parse(saved) : {
      theme: 'light',
      defaultPerPage: 25,
      showAvatars: true,
      compactMode: false,
    };
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('github-monitor-prefs', JSON.stringify(preferences));
  }, [preferences]);

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/api/profile/me');
      return res.data;
    },
  });

  // Fetch rate limit
  const { data: rateLimit, isLoading: rateLimitLoading, refetch: refetchRateLimit } = useQuery<RateLimit>({
    queryKey: ['rateLimit'],
    queryFn: async () => {
      const res = await api.get('/api/profile/rate-limit');
      return res.data;
    },
    enabled: activeTab === 'rate-limit',
    refetchInterval: activeTab === 'rate-limit' ? 30000 : false,
  });

  // Fetch activity
  const { data: activity, isLoading: activityLoading } = useQuery<UserActivity>({
    queryKey: ['userActivity'],
    queryFn: async () => {
      const res = await api.get('/api/profile/activity');
      return res.data;
    },
    enabled: activeTab === 'activity',
  });

  const formatDiskUsage = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getResetTime = (resetStr: string) => {
    const reset = new Date(resetStr);
    const now = new Date();
    const diffMins = Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60));
    if (diffMins <= 0) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.ceil(diffMins / 60)}h`;
  };

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['profile', 'activity', 'rate-limit', 'preferences'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              {profileLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : profile ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Profile Card */}
                  <div className="md:col-span-1">
                    <div className="text-center">
                      <img
                        src={profile.avatar_url}
                        alt={profile.login}
                        className="w-32 h-32 rounded-full mx-auto ring-4 ring-gray-100"
                      />
                      <h2 className="mt-4 text-xl font-semibold text-gray-900">{profile.name || profile.login}</h2>
                      <p className="text-gray-500">@{profile.login}</p>
                      {profile.bio && (
                        <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
                      )}
                      <a
                        href={profile.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        View on GitHub
                      </a>
                    </div>

                    {/* Stats */}
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{profile.followers}</div>
                        <div className="text-xs text-gray-500">Followers</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{profile.following}</div>
                        <div className="text-xs text-gray-500">Following</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{profile.public_repos}</div>
                        <div className="text-xs text-gray-500">Public Repos</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-900">{profile.public_gists}</div>
                        <div className="text-xs text-gray-500">Gists</div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Details</h3>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.company && (
                          <div>
                            <dt className="text-sm text-gray-500">Company</dt>
                            <dd className="text-sm font-medium text-gray-900">{profile.company}</dd>
                          </div>
                        )}
                        {profile.location && (
                          <div>
                            <dt className="text-sm text-gray-500">Location</dt>
                            <dd className="text-sm font-medium text-gray-900">{profile.location}</dd>
                          </div>
                        )}
                        {profile.email && (
                          <div>
                            <dt className="text-sm text-gray-500">Email</dt>
                            <dd className="text-sm font-medium text-gray-900">{profile.email}</dd>
                          </div>
                        )}
                        {profile.blog && (
                          <div>
                            <dt className="text-sm text-gray-500">Website</dt>
                            <dd className="text-sm font-medium text-blue-600">
                              <a href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`} target="_blank" rel="noreferrer">
                                {profile.blog}
                              </a>
                            </dd>
                          </div>
                        )}
                        {profile.twitter_username && (
                          <div>
                            <dt className="text-sm text-gray-500">Twitter</dt>
                            <dd className="text-sm font-medium text-blue-600">
                              <a href={`https://twitter.com/${profile.twitter_username}`} target="_blank" rel="noreferrer">
                                @{profile.twitter_username}
                              </a>
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-sm text-gray-500">Member Since</dt>
                          <dd className="text-sm font-medium text-gray-900">{formatDate(profile.created_at)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Account</h3>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-gray-500">Private Repos</dt>
                          <dd className="text-sm font-medium text-gray-900">{profile.owned_private_repos || 0}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">Disk Usage</dt>
                          <dd className="text-sm font-medium text-gray-900">{formatDiskUsage(profile.disk_usage || 0)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">2FA Enabled</dt>
                          <dd className={`text-sm font-medium ${profile.two_factor_authentication ? 'text-green-600' : 'text-red-600'}`}>
                            {profile.two_factor_authentication ? 'Yes' : 'No'}
                          </dd>
                        </div>
                        {profile.plan && (
                          <div>
                            <dt className="text-sm text-gray-500">Plan</dt>
                            <dd className="text-sm font-medium text-gray-900 capitalize">{profile.plan.name}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              {activityLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : activity ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Activity by Type */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Activity by Type</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={activity.byType.slice(0, 6)}
                            dataKey="count"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ type }) => type.replace('Event', '')}
                          >
                            {activity.byType.slice(0, 6).map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Activity by Day */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Activity by Day</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={activity.byDay.slice(-14)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" name="Events" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Activity Types List */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Event Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {activity.byType.map((item, idx) => (
                        <div key={item.type} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-2xl font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                            {item.count}
                          </div>
                          <div className="text-xs text-gray-500">{item.type.replace('Event', '')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Rate Limit Tab */}
          {activeTab === 'rate-limit' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">API Rate Limits</h3>
                <button
                  onClick={() => refetchRateLimit()}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Refresh
                </button>
              </div>
              {rateLimitLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : rateLimit ? (
                <div className="space-y-6">
                  {Object.entries(rateLimit.resources).map(([name, limits]) => (
                    <div key={name} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 capitalize">{name} API</h4>
                        <span className="text-sm text-gray-500">Resets in {getResetTime(limits.reset)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm text-gray-500 mb-1">
                            <span>{limits.remaining} remaining</span>
                            <span>{limits.limit} limit</span>
                          </div>
                          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                limits.remaining / limits.limit > 0.5
                                  ? 'bg-green-500'
                                  : limits.remaining / limits.limit > 0.2
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${(limits.remaining / limits.limit) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{limits.used}</div>
                          <div className="text-xs text-gray-500">used</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Display Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Show Avatars</label>
                      <p className="text-xs text-gray-500">Display user avatars in lists</p>
                    </div>
                    <button
                      onClick={() => setPreferences({ ...preferences, showAvatars: !preferences.showAvatars })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.showAvatars ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.showAvatars ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Compact Mode</label>
                      <p className="text-xs text-gray-500">Reduce spacing in lists</p>
                    </div>
                    <button
                      onClick={() => setPreferences({ ...preferences, compactMode: !preferences.compactMode })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.compactMode ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.compactMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Items Per Page</label>
                    <select
                      value={preferences.defaultPerPage}
                      onChange={(e) => setPreferences({ ...preferences, defaultPerPage: parseInt(e.target.value) })}
                      className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data</h3>
                <button
                  onClick={() => {
                    localStorage.removeItem('github-monitor-prefs');
                    setPreferences({
                      theme: 'light',
                      defaultPerPage: 25,
                      showAvatars: true,
                      compactMode: false,
                    });
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Reset Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
