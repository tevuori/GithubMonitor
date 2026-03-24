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

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  author: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  tarball_url: string;
  zipball_url: string;
  assets: Array<{
    id: number;
    name: string;
    size: number;
    download_count: number;
    browser_download_url: string;
    content_type: string;
  }>;
}

const Releases = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    tag_name: '',
    name: '',
    body: '',
    draft: false,
    prerelease: false,
    target_commitish: 'main',
  });

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

  // Fetch releases
  const { data: releases, isLoading: releasesLoading } = useQuery<Release[]>({
    queryKey: ['releases', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/releases/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Fetch tags for the dropdown
  const { data: tags } = useQuery<Array<{ name: string }>>({
    queryKey: ['tags', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/releases/${selectedRepo.owner.login}/${selectedRepo.name}/tags`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Create release mutation
  const createReleaseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!selectedRepo) throw new Error('No repo selected');
      const res = await api.post(`/api/releases/${selectedRepo.owner.login}/${selectedRepo.name}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Release created successfully!');
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      setShowCreateModal(false);
      setFormData({ tag_name: '', name: '', body: '', draft: false, prerelease: false, target_commitish: 'main' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create release');
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="releases-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="releases-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Releases</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2"
          data-testid="create-release-btn"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Release
        </button>
      </div>

      {/* Repository selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Repository</label>
        <select
          data-testid="releases-repo-selector"
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={selectedRepo?.full_name || ''}
          onChange={(e) => {
            const repo = repos?.find(r => r.full_name === e.target.value);
            setSelectedRepo(repo || null);
          }}
        >
          {repos?.map((repo) => (
            <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
          ))}
        </select>
      </div>

      {/* Releases list */}
      {releasesLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : releases && releases.length > 0 ? (
        <div className="space-y-4">
          {releases.map((release) => (
            <div key={release.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {release.name || release.tag_name}
                      </h2>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                        {release.tag_name}
                      </span>
                      {release.draft && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-sm">Draft</span>
                      )}
                      {release.prerelease && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-sm">Pre-release</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <img src={release.author.avatar_url} alt={release.author.login} className="w-5 h-5 rounded-full" />
                      <span>{release.author.login}</span>
                      <span>·</span>
                      <span>{formatDate(release.published_at || release.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={release.zipball_url}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      ZIP
                    </a>
                    <a
                      href={release.tarball_url}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      TAR
                    </a>
                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                    >
                      View on GitHub
                    </a>
                  </div>
                </div>

                {/* Release body */}
                {release.body && (
                  <div className="mt-4 prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {release.body}
                    </pre>
                  </div>
                )}

                {/* Assets */}
                {release.assets.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Assets ({release.assets.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {release.assets.map((asset) => (
                        <a
                          key={asset.id}
                          href={asset.browser_download_url}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{asset.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{formatSize(asset.size)}</span>
                            <span>{asset.download_count} downloads</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No releases yet</h3>
          <p className="text-gray-500 mb-4">Create your first release to share your project.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            Create Release
          </button>
        </div>
      )}

      {/* Create Release Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create New Release</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createReleaseMutation.mutate(formData);
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag name *</label>
                <input
                  type="text"
                  required
                  value={formData.tag_name}
                  onChange={(e) => setFormData({ ...formData, tag_name: e.target.value })}
                  placeholder="v1.0.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="release-tag-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Release title</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Release title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target branch</label>
                <input
                  type="text"
                  value={formData.target_commitish}
                  onChange={(e) => setFormData({ ...formData, target_commitish: e.target.value })}
                  placeholder="main"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={6}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Describe this release..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.prerelease}
                    onChange={(e) => setFormData({ ...formData, prerelease: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Pre-release</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.draft}
                    onChange={(e) => setFormData({ ...formData, draft: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Draft</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReleaseMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                  data-testid="submit-release-btn"
                >
                  {createReleaseMutation.isPending ? 'Creating...' : 'Publish Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Releases;
