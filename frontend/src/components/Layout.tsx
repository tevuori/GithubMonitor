import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

// ── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
const GitBranchIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>);
const GitCommitIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v6M12 15v6M3 12h6M15 12h6" /></svg>);
const GitPullRequestIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>);
const AlertCircleIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const BarChart3Icon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
const SearchIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>);
const FolderIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>);
const ChartIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
const OrgIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const DiffIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" /></svg>);
const ReleaseIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>);
const InsightsIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
const SecurityIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>);
const NotificationIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>);
const SettingsIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const DependencyIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>);
const ActivityIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>);
const MilestoneIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>);
const ProfileIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const ReportIcon = () => (<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>);

const GearIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SunIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

// ── Env Settings Modal ────────────────────────────────────────────────────────
interface EnvField { key: string; label: string; type?: string; hint?: string; }

const ENV_FIELDS: EnvField[] = [
  { key: 'GITHUB_CLIENT_ID',     label: 'GitHub Client ID' },
  { key: 'GITHUB_CLIENT_SECRET', label: 'GitHub Client Secret', type: 'password' },
  { key: 'SESSION_SECRET',       label: 'Session Secret',        type: 'password', hint: 'Long random string' },
  { key: 'GITHUB_CALLBACK_URL',  label: 'OAuth Callback URL',    hint: 'e.g. http://localhost:3000/auth/github/callback' },
  { key: 'PORT',                 label: 'Backend Port',          hint: 'Default: 8001' },
  { key: 'FRONTEND_URL',         label: 'Frontend URL',          hint: 'e.g. http://localhost:5173' },
  { key: 'CORS_ORIGIN',          label: 'CORS Origin',           hint: 'Same as Frontend URL in dev' },
];

const EnvSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    api.get('/api/env/values')
      .then(res => {
        setValues(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.post('/api/env/setup', values);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="relative bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Environment Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            ENV_FIELDS.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground">{field.label}</label>
                <input
                  type={field.type || 'text'}
                  value={values[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.hint || ''}
                  className="mt-1 block w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {field.hint && <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center gap-3">
          {error && <p className="text-sm text-destructive flex-1">{error}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400 flex-1">Saved successfully!</p>}
          {!error && !success && <p className="text-xs text-muted-foreground flex-1">Changes are written to the root <code>.env</code> file.</p>}
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Layout ────────────────────────────────────────────────────────────────────
const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [envModalOpen, setEnvModalOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Repositories', href: '/repositories', icon: GitBranchIcon },
    { name: 'Commits', href: '/commits', icon: GitCommitIcon },
    { name: 'Pull Requests', href: '/pull-requests', icon: GitPullRequestIcon },
    { name: 'Issues', href: '/issues', icon: AlertCircleIcon },
    { name: 'Branches', href: '/branches', icon: GitBranchIcon },
    { name: 'Diff Viewer', href: '/diff', icon: DiffIcon },
    { name: 'Workflows', href: '/workflows', icon: BarChart3Icon },
    { name: 'Releases', href: '/releases', icon: ReleaseIcon },
    { name: 'Milestones', href: '/milestones', icon: MilestoneIcon },
    { name: 'Contributors', href: '/contributors', icon: BarChart3Icon },
    { name: 'Insights', href: '/insights', icon: InsightsIcon },
    { name: 'Dependencies', href: '/dependencies', icon: DependencyIcon },
    { name: 'Security', href: '/security', icon: SecurityIcon },
    { name: 'Activity Feed', href: '/activity', icon: ActivityIcon },
    { name: 'Code Search', href: '/search', icon: SearchIcon },
    { name: 'File Browser', href: '/files', icon: FolderIcon },
    { name: 'Traffic', href: '/traffic', icon: ChartIcon },
    { name: 'Organization', href: '/organization', icon: OrgIcon },
    { name: 'Repo Settings', href: '/settings', icon: SettingsIcon },
    { name: 'Notifications', href: '/notifications', icon: NotificationIcon },
    { name: 'Profile', href: '/profile', icon: ProfileIcon },
    { name: 'Reports', href: '/reports', icon: ReportIcon },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {envModalOpen && <EnvSettingsModal onClose={() => setEnvModalOpen(false)} />}

      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-card border-r border-border overflow-y-auto">
          {/* Logo + title + gear + theme toggle */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center flex-1 min-w-0">
              <div className="h-8 w-8 flex-shrink-0 bg-foreground rounded-md flex items-center justify-center">
                <svg className="h-5 w-5 text-background" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="ml-3 text-xl font-bold text-foreground truncate">GitHub Monitor</span>
            </div>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="ml-1 flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => setEnvModalOpen(true)}
              title="Environment Settings"
              className="ml-1 flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <GearIcon />
            </button>
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <Icon />
                    <span className="ml-3">{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {user && (
            <div className="flex-shrink-0 flex border-t border-border p-4">
              <div className="flex items-center w-full">
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{user.displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.username}</div>
                </div>
                <button onClick={logout} className="ml-auto text-sm text-muted-foreground hover:text-foreground">Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
