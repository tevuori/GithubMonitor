import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface RepoSettings {
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  default_branch: string;
  visibility: string;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  allow_squash_merge: boolean;
  allow_merge_commit: boolean;
  allow_rebase_merge: boolean;
  delete_branch_on_merge: boolean;
  archived: boolean;
  topics: string[];
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

interface Collaborator {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  role_name: string;
}

interface Webhook {
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: string;
  };
  created_at: string;
}

interface BranchProtection {
  protected: boolean;
  required_status_checks?: any;
  enforce_admins?: any;
  required_pull_request_reviews?: any;
  restrictions?: any;
}

const Settings = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'branches' | 'collaborators' | 'webhooks'>('general');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const queryClient = useQueryClient();

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

  // Fetch repo settings
  const { data: settings, isLoading: settingsLoading } = useQuery<RepoSettings>({
    queryKey: ['repoSettings', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) throw new Error('No repo');
      const res = await api.get(`/api/settings/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Set default branch for protection
  useEffect(() => {
    if (settings?.default_branch && !selectedBranch) {
      setSelectedBranch(settings.default_branch);
    }
  }, [settings, selectedBranch]);

  // Fetch branches
  const { data: branches } = useQuery<Array<{ name: string; protected: boolean }>>({
    queryKey: ['branches', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/branches/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Fetch branch protection
  const { data: protection, isLoading: protectionLoading } = useQuery<BranchProtection>({
    queryKey: ['branchProtection', selectedRepo?.owner.login, selectedRepo?.name, selectedBranch],
    queryFn: async () => {
      if (!selectedRepo || !selectedBranch) return { protected: false };
      const res = await api.get(`/api/settings/${selectedRepo.owner.login}/${selectedRepo.name}/branches/${selectedBranch}/protection`);
      return res.data;
    },
    enabled: !!selectedRepo && !!selectedBranch,
  });

  // Fetch collaborators
  const { data: collaborators, isLoading: collaboratorsLoading } = useQuery<Collaborator[]>({
    queryKey: ['collaborators', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/settings/${selectedRepo.owner.login}/${selectedRepo.name}/collaborators`);
      return res.data;
    },
    enabled: !!selectedRepo && activeTab === 'collaborators',
  });

  // Fetch webhooks
  const { data: webhooks, isLoading: webhooksLoading } = useQuery<Webhook[]>({
    queryKey: ['webhooks', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/settings/${selectedRepo.owner.login}/${selectedRepo.name}/hooks`);
      return res.data;
    },
    enabled: !!selectedRepo && activeTab === 'webhooks',
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'maintain': return 'bg-orange-100 text-orange-700';
      case 'write': return 'bg-blue-100 text-blue-700';
      case 'triage': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="settings-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Repository Settings</h1>
      </div>

      {/* Repository selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Repository</label>
        <select
          data-testid="settings-repo-selector"
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={selectedRepo?.full_name || ''}
          onChange={(e) => {
            const repo = repos?.find(r => r.full_name === e.target.value);
            setSelectedRepo(repo || null);
            setSelectedBranch('');
          }}
        >
          {repos?.map((repo) => (
            <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['general', 'branches', 'collaborators', 'webhooks'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {settingsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : settings ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Repository Name</label>
                      <input
                        type="text"
                        value={settings.name}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Branch</label>
                      <input
                        type="text"
                        value={settings.default_branch}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={settings.description || ''}
                      readOnly
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
                    <div className="flex flex-wrap gap-2">
                      {settings.topics?.map((topic) => (
                        <span key={topic} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                      {(!settings.topics || settings.topics.length === 0) && (
                        <span className="text-gray-500 text-sm">No topics</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${settings.private ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm text-gray-700">{settings.private ? 'Private' : 'Public'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${settings.archived ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm text-gray-700">{settings.archived ? 'Archived' : 'Active'}</span>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Issues', enabled: settings.has_issues },
                        { label: 'Projects', enabled: settings.has_projects },
                        { label: 'Wiki', enabled: settings.has_wiki },
                      ].map((feature) => (
                        <div key={feature.label} className="flex items-center gap-2">
                          <svg className={`w-5 h-5 ${feature.enabled ? 'text-green-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{feature.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Merge Settings</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Squash Merge', enabled: settings.allow_squash_merge },
                        { label: 'Merge Commit', enabled: settings.allow_merge_commit },
                        { label: 'Rebase Merge', enabled: settings.allow_rebase_merge },
                        { label: 'Delete Branch on Merge', enabled: settings.delete_branch_on_merge },
                      ].map((setting) => (
                        <div key={setting.label} className="flex items-center gap-2">
                          <svg className={`w-5 h-5 ${setting.enabled ? 'text-green-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{setting.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Permissions</h3>
                    <div className="flex gap-4">
                      {settings.permissions?.admin && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Admin</span>
                      )}
                      {settings.permissions?.push && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Push</span>
                      )}
                      {settings.permissions?.pull && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Pull</span>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Branch Protection */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch</label>
                <select
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  {branches?.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name} {branch.protected ? '(protected)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {protectionLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : protection?.protected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Branch is protected</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {protection.required_status_checks && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Required Status Checks</h4>
                        <p className="text-sm text-gray-500">
                          Strict: {protection.required_status_checks.strict ? 'Yes' : 'No'}
                        </p>
                      </div>
                    )}
                    {protection.enforce_admins && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Enforce on Admins</h4>
                        <p className="text-sm text-gray-500">
                          {protection.enforce_admins.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    )}
                    {protection.required_pull_request_reviews && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Required Reviews</h4>
                        <p className="text-sm text-gray-500">
                          {protection.required_pull_request_reviews.required_approving_review_count || 1} approval(s) required
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-gray-500">This branch is not protected</p>
                  <p className="text-sm text-gray-400 mt-1">Configure protection rules on GitHub</p>
                </div>
              )}
            </div>
          )}

          {/* Collaborators */}
          {activeTab === 'collaborators' && (
            <div>
              {collaboratorsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : collaborators && collaborators.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {collaborators.map((collab) => (
                    <div key={collab.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={collab.avatar_url} alt={collab.login} className="w-10 h-10 rounded-full" />
                        <div>
                          <a
                            href={collab.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {collab.login}
                          </a>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(collab.role_name)}`}>
                              {collab.role_name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {collab.permissions?.admin && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded">admin</span>}
                        {collab.permissions?.push && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">push</span>}
                        {collab.permissions?.pull && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">pull</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No collaborators or insufficient permissions to view</p>
                </div>
              )}
            </div>
          )}

          {/* Webhooks */}
          {activeTab === 'webhooks' && (
            <div>
              {webhooksLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : webhooks && webhooks.length > 0 ? (
                <div className="space-y-4">
                  {webhooks.map((hook) => (
                    <div key={hook.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hook.active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="font-medium text-gray-900">{hook.name}</span>
                        </div>
                        <span className={`text-xs ${hook.active ? 'text-green-600' : 'text-gray-500'}`}>
                          {hook.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 font-mono truncate">{hook.config.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {hook.events.slice(0, 5).map((event) => (
                          <span key={event} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {event}
                          </span>
                        ))}
                        {hook.events.length > 5 && (
                          <span className="text-xs text-gray-500">+{hook.events.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No webhooks configured or insufficient permissions to view</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
