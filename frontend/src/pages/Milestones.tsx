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

interface Milestone {
  id: number;
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed';
  open_issues: number;
  closed_issues: number;
  created_at: string;
  updated_at: string;
  due_on: string | null;
  closed_at: string | null;
  html_url: string;
  progress: number;
}

interface Project {
  id: number;
  name: string;
  body: string;
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

const Milestones = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [activeTab, setActiveTab] = useState<'milestones' | 'projects'>('milestones');
  const [milestoneState, setMilestoneState] = useState<'open' | 'closed' | 'all'>('open');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_on: '',
  });
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

  // Fetch milestones
  const { data: milestones, isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: ['milestones', selectedRepo?.owner.login, selectedRepo?.name, milestoneState],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/milestones/${selectedRepo.owner.login}/${selectedRepo.name}/milestones`, {
        params: { state: milestoneState },
      });
      return res.data;
    },
    enabled: !!selectedRepo && activeTab === 'milestones',
  });

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['projects', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/milestones/${selectedRepo.owner.login}/${selectedRepo.name}/projects`);
      return res.data;
    },
    enabled: !!selectedRepo && activeTab === 'projects',
  });

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!selectedRepo) throw new Error('No repo');
      const payload: any = { title: data.title };
      if (data.description) payload.description = data.description;
      if (data.due_on) payload.due_on = new Date(data.due_on).toISOString();
      const res = await api.post(`/api/milestones/${selectedRepo.owner.login}/${selectedRepo.name}/milestones`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Milestone created!');
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      setShowCreateModal(false);
      setFormData({ title: '', description: '', due_on: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create milestone');
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDueStatus = (dueOn: string | null, state: string) => {
    if (state === 'closed') return 'closed';
    if (!dueOn) return 'none';
    const due = new Date(dueOn);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'soon';
    return 'ok';
  };

  const getDueColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'soon': return 'text-amber-600 bg-amber-50';
      case 'closed': return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800';
      default: return 'text-green-600 bg-green-50';
    }
  };

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="milestones-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="milestones-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">Milestones & Projects</h1>
        {activeTab === 'milestones' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Milestone
          </button>
        )}
      </div>

      {/* Repository selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repository</label>
        <select
          className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
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

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('milestones')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'milestones'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              Milestones
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              Projects (Classic)
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              {/* State Filter */}
              <div className="flex gap-2">
                {(['open', 'closed', 'all'] as const).map((state) => (
                  <button
                    key={state}
                    onClick={() => setMilestoneState(state)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                      milestoneState === state
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-800'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>

              {milestonesLoading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : milestones && milestones.length > 0 ? (
                <div className="space-y-4">
                  {milestones.map((milestone) => {
                    const dueStatus = getDueStatus(milestone.due_on, milestone.state);
                    return (
                      <div key={milestone.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <a
                                href={milestone.html_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-lg font-semibold text-gray-900 dark:text-gray-300 hover:text-blue-600"
                              >
                                {milestone.title}
                              </a>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                milestone.state === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                              }`}>
                                {milestone.state}
                              </span>
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{milestone.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className={`px-2 py-0.5 rounded ${getDueColor(dueStatus)}`}>
                                {milestone.due_on ? formatDate(milestone.due_on) : 'No due date'}
                              </span>
                              <span>{milestone.open_issues} open</span>
                              <span>{milestone.closed_issues} closed</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>{milestone.progress}% complete</span>
                            <span>{milestone.closed_issues} / {milestone.open_issues + milestone.closed_issues}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${milestone.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No milestones</h3>
                  <p className="text-gray-500 mt-1">Create a milestone to track progress on issues.</p>
                </div>
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              {projectsLoading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <a
                      key={project.id}
                      href={project.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        <h3 className="font-medium text-gray-900 dark:text-gray-300">{project.name}</h3>
                      </div>
                      {project.body && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{project.body}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Updated {formatDate(project.updated_at)}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No classic projects</h3>
                  <p className="text-gray-500 mt-1">Projects (classic) may be disabled or use the new Projects feature.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Milestone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300">Create Milestone</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMilestoneMutation.mutate(formData);
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="v1.0 Release"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Milestone description..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_on}
                  onChange={(e) => setFormData({ ...formData, due_on: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMilestoneMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                >
                  {createMilestoneMutation.isPending ? 'Creating...' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Milestones;
