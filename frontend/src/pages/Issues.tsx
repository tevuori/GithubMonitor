import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  body: string;
  user: { login: string; avatar_url: string; html_url: string };
  labels: Array<{ id: number; name: string; color: string }>;
  assignees: Array<{ login: string; avatar_url: string }>;
  milestone: { number: number; title: string; state: string } | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
}

interface IssueDetails {
  id: number;
  number: number;
  title: string;
  state: string;
  state_reason: string | null;
  body: string;
  user: { login: string; avatar_url: string; html_url: string };
  labels: Array<{ id: number; name: string; color: string }>;
  assignees: Array<{ login: string; avatar_url: string }>;
  milestone: { number: number; title: string; state: string } | null;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: { login: string; avatar_url: string } | null;
  html_url: string;
  reactions: any;
}

interface Comment {
  id: number;
  body: string;
  user: { login: string; avatar_url: string; html_url: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  reactions: any;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

const Issues: React.FC = () => {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<{ owner: string; repo: string; number: number } | null>(null);
  const [issueState, setIssueState] = useState<'open' | 'closed' | 'all'>('open');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const queryClient = useQueryClient();

  // Fetch repos
  const { data: repos } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: () => api.get('/api/repos').then(r => r.data),
  });

  // Auto-select first repo
  useEffect(() => {
    if (repos && repos.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0].full_name);
    }
  }, [repos, selectedRepo]);

  const [owner, repo] = selectedRepo.split('/');

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      if (!owner || !repo) throw new Error('No repository selected');
      if (!newTitle.trim()) throw new Error('Title is required');
      const payload: any = { title: newTitle.trim() };
      if (newBody.trim()) payload.body = newBody;
      const res = await api.post(`/api/issues/${owner}/${repo}`, payload);
      return res.data as Issue;
    },
    onSuccess: (created) => {
      toast.success(`Issue #${created.number} created`);
      queryClient.invalidateQueries({ queryKey: ['repoIssues', owner, repo] });
      setShowCreate(false);
      setNewTitle('');
      setNewBody('');
      setSelectedIssue({ owner, repo, number: created.number });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create issue');
    },
  });

  // Fetch issues for selected repo
  const { data: issues, isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ['repoIssues', owner, repo, issueState],
    queryFn: () => api.get(`/api/issues/${owner}/${repo}`, { params: { state: issueState } }).then(r => r.data),
    enabled: !!owner && !!repo,
  });

  // Fetch issue details
  const { data: issueDetails, isLoading: detailsLoading } = useQuery<IssueDetails>({
    queryKey: ['issueDetails', selectedIssue?.owner, selectedIssue?.repo, selectedIssue?.number],
    queryFn: () => api.get(`/api/issues/${selectedIssue!.owner}/${selectedIssue!.repo}/${selectedIssue!.number}`).then(r => r.data),
    enabled: !!selectedIssue,
  });

  // Fetch issue comments
  const { data: comments, isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ['issueComments', selectedIssue?.owner, selectedIssue?.repo, selectedIssue?.number],
    queryFn: () => api.get(`/api/issues/${selectedIssue!.owner}/${selectedIssue!.repo}/${selectedIssue!.number}/comments`).then(r => r.data),
    enabled: !!selectedIssue && (issueDetails?.comments || 0) > 0,
  });

  // Filter issues by search
  const filteredIssues = issues?.filter(issue =>
    searchTerm === '' ||
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.number.toString().includes(searchTerm)
  );

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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  // Simple markdown-like rendering
  const renderBody = (body: string | null) => {
    if (!body) return <p className="text-gray-500 italic">No description provided.</p>;

    const rendered = body
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono">$2</pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline">$1</a>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mt-3">')
      .replace(/\n/g, '<br/>');

    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: `<p>${rendered}</p>` }} />;
  };

  return (
    <div className="space-y-6" data-testid="issues-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage issues for your repositories</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            value={selectedRepo}
            onChange={e => {
              setSelectedRepo(e.target.value);
              setSelectedIssue(null);
              setShowCreate(false);
            }}
            data-testid="repo-selector"
          >
            <option value="">Select a repository</option>
            {repos?.map((r) => (
              <option key={r.id} value={r.full_name}>{r.full_name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowCreate(v => !v)}
            disabled={!owner || !repo}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
            data-testid="new-issue-btn"
          >
            {showCreate ? 'Close' : 'New issue'}
          </button>
        </div>
      </div>

      {/* Create issue */}
      {showCreate && owner && repo && (
        <div className="bg-white rounded-lg shadow p-4" data-testid="create-issue-panel">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Create issue</h2>
            <span className="text-xs text-gray-500 font-mono">{owner}/{repo}</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Short summary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body (optional)</label>
              <textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[120px]"
                placeholder="Describe the problem / task…"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => createIssueMutation.mutate()}
                disabled={createIssueMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                data-testid="create-issue-submit"
              >
                {createIssueMutation.isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewTitle('');
                  setNewBody('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {selectedRepo && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            {(['open', 'closed', 'all'] as const).map((state) => (
              <button
                key={state}
                onClick={() => setIssueState(state)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  issueState === state ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {state}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Stats */}
      {issues && (
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-900">{filteredIssues?.length}</span> issues
          </span>
          <span className="text-green-600">
            {issues.filter(i => i.state === 'open').length} open
          </span>
          <span className="text-gray-500">
            {issues.filter(i => i.state === 'closed').length} closed
          </span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Issues List */}
        <div className={`bg-white shadow rounded-xl overflow-hidden ${selectedIssue ? 'w-2/5' : 'w-full'}`}>
          {issuesLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          )}

          {!selectedRepo && !issuesLoading && (
            <div className="p-8 text-center">
              <p className="text-gray-400">Select a repository to view issues</p>
            </div>
          )}

          {filteredIssues && filteredIssues.length === 0 && (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No issues found</p>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {filteredIssues?.map((issue) => (
              <div
                key={issue.id}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedIssue?.number === issue.number ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
                onClick={() => setSelectedIssue({ owner, repo, number: issue.number })}
                data-testid={`issue-${issue.number}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${issue.state === 'open' ? 'text-green-600' : 'text-purple-600'}`}>
                    {issue.state === 'open' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{issue.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">#{issue.number}</span>
                      {issue.labels?.slice(0, 3).map((label) => (
                        <span
                          key={label.id}
                          className="px-1.5 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor: `#${label.color}22`,
                            color: `#${label.color}`
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {issue.comments > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {issue.comments}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      opened {formatRelativeTime(issue.created_at)} by {issue.user?.login}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Issue Details Panel */}
        {selectedIssue && (
          <div className="w-3/5 bg-white shadow rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Issue Details</h2>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : issueDetails ? (
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {/* Issue Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-start gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      issueDetails.state === 'open' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {issueDetails.state}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">{issueDetails.title}</h2>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <img src={issueDetails.user?.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                    <span>{issueDetails.user?.login}</span>
                    <span>opened {formatRelativeTime(issueDetails.created_at)}</span>
                    <span>·</span>
                    <span>{issueDetails.comments} comments</span>
                  </div>

                  {/* Labels, Assignees, Milestone */}
                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    {issueDetails.labels && issueDetails.labels.length > 0 && (
                      <div>
                        <span className="text-gray-500">Labels: </span>
                        {issueDetails.labels.map((label: any) => (
                          <span
                            key={label.id}
                            className="px-2 py-0.5 rounded-full text-xs ml-1"
                            style={{ backgroundColor: `#${label.color}22`, color: `#${label.color}` }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {issueDetails.assignees && issueDetails.assignees.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Assignees: </span>
                        {issueDetails.assignees.map((assignee: any) => (
                          <img key={assignee.login} src={assignee.avatar_url} className="w-5 h-5 rounded-full" title={assignee.login} alt="" />
                        ))}
                      </div>
                    )}
                    {issueDetails.milestone && (
                      <div>
                        <span className="text-gray-500">Milestone: </span>
                        <span className="text-gray-700">{issueDetails.milestone.title}</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={issueDetails.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                  >
                    View on GitHub →
                  </a>
                </div>

                {/* Issue Body */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <img src={issueDetails.user?.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="font-medium text-gray-700">{issueDetails.user?.login}</span> commented {formatRelativeTime(issueDetails.created_at)}
                      </div>
                      {renderBody(issueDetails.body)}
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {issueDetails.comments > 0 && (
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Comments ({issueDetails.comments})</h3>
                    {commentsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                      </div>
                    ) : comments && comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-3">
                            <img src={comment.user?.avatar_url} className="w-8 h-8 rounded-full" alt="" />
                            <div className="flex-1 bg-gray-50 rounded-lg p-4">
                              <div className="text-xs text-gray-500 mb-2">
                                <span className="font-medium text-gray-700">{comment.user?.login}</span> commented {formatRelativeTime(comment.created_at)}
                              </div>
                              {renderBody(comment.body)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Failed to load comments</p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Issues;
