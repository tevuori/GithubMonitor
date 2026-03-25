import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface PRFile {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface Review {
  id: number;
  user: { login: string; avatar_url: string };
  state: string;
  body: string;
  submitted_at: string;
}

interface Comment {
  id: number;
  user: { login: string; avatar_url: string };
  body: string;
  path: string;
  line?: number;
  created_at: string;
}

const PRReview = () => {
  const { owner, repo, pullNumber } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'conversation' | 'files' | 'commits'>('conversation');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge');
  const [mergeResult, setMergeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showMergePanel, setShowMergePanel] = useState(false);

  const { data: pr, isLoading, error } = useQuery({
    queryKey: ['pr', owner, repo, pullNumber],
    queryFn: async () => {
      const res = await api.get(`/api/pulls/${owner}/${repo}/${pullNumber}`);
      return res.data;
    },
    enabled: !!owner && !!repo && !!pullNumber,
  });

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/pulls/${owner}/${repo}/${pullNumber}/merge`, {
        merge_method: mergeMethod,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMergeResult({ success: true, message: data.message || 'Pull request successfully merged!' });
      queryClient.invalidateQueries({ queryKey: ['pr', owner, repo, pullNumber] });
      queryClient.invalidateQueries({ queryKey: ['pulls'] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error || 'Failed to merge pull request.';
      setMergeResult({ success: false, message });
    },
  });

  const toggleFile = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'changes_requested': return 'text-red-600 bg-red-100';
      case 'commented': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-600';
      case 'removed': return 'text-red-600';
      case 'modified': return 'text-yellow-600';
      case 'renamed': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load pull request</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const isMerged = pr.merged;
  const isOpen = pr.state === 'open' && !isMerged;

  return (
    <div className="space-y-6" data-testid="pr-review-page">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                pr.state === 'open' ? 'bg-green-100 text-green-700' : 
                pr.merged ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
              }`}>
                {pr.merged ? 'Merged' : pr.state}
              </span>
              <h1 className="text-xl font-semibold text-gray-900">
                {pr.title}
              </h1>
              <span className="text-gray-500">#{pr.number}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium">{pr.user?.login}</span> wants to merge{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">{pr.head?.ref}</span> into{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">{pr.base?.ref}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOpen && (
              <button
                onClick={() => { setShowMergePanel(!showMergePanel); setMergeResult(null); }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {showMergePanel ? 'Cancel' : '⬇ Merge PR'}
              </button>
            )}
            <a
              href={pr.html_url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Merge Panel */}
        {isOpen && showMergePanel && (
          <div className="mt-4 border border-green-200 bg-green-50 rounded-lg p-4">
            {mergeResult ? (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${
                mergeResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <span className="text-lg">{mergeResult.success ? '✅' : '❌'}</span>
                <span className="text-sm font-medium">{mergeResult.message}</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700 mb-3">Merge pull request into <span className="font-mono bg-white px-1 rounded border">{pr.base?.ref}</span></p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 font-medium">Method:</label>
                    <select
                      value={mergeMethod}
                      onChange={(e) => setMergeMethod(e.target.value as any)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                    >
                      <option value="merge">Create a merge commit</option>
                      <option value="squash">Squash and merge</option>
                      <option value="rebase">Rebase and merge</option>
                    </select>
                  </div>
                  <button
                    onClick={() => mergeMutation.mutate()}
                    disabled={mergeMutation.isPending}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded text-sm font-medium transition-colors"
                  >
                    {mergeMutation.isPending ? 'Merging...' : 'Confirm Merge'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{pr.comments} comments</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{pr.commits} commits</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{pr.changed_files} files changed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">+{pr.additions}</span>
            <span className="text-red-600">-{pr.deletions}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(['conversation', 'files', 'commits'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'files' && <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{pr.files?.length || 0}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'conversation' && (
        <div className="space-y-4">
          {/* PR Body */}
          {pr.body && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-3">
                <img src={pr.user?.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pr.user?.login}</span>
                    <span className="text-gray-500 text-sm">opened this PR</span>
                  </div>
                  <div className="mt-2 prose prose-sm max-w-none text-gray-700">
                    {pr.body}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          {pr.reviews?.map((review: Review) => (
            <div key={review.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-3">
                <img src={review.user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{review.user.login}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStateColor(review.state)}`}>
                      {review.state.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {new Date(review.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.body && (
                    <div className="mt-2 text-gray-700">{review.body}</div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Comments */}
          {pr.comments?.map((comment: Comment) => (
            <div key={comment.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-3">
                <img src={comment.user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comment.user.login}</span>
                    <span className="text-gray-500 text-sm">
                      commented on <span className="font-mono text-xs bg-gray-100 px-1 rounded">{comment.path}</span>
                    </span>
                  </div>
                  <div className="mt-2 text-gray-700">{comment.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-2">
          {pr.files?.map((file: PRFile) => (
            <div key={file.sha} className="bg-white rounded-lg shadow overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleFile(file.filename)}
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 transform transition-transform ${expandedFiles.has(file.filename) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                    {file.status}
                  </span>
                  <span className="font-mono text-sm">{file.filename}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">+{file.additions}</span>
                  <span className="text-red-600">-{file.deletions}</span>
                </div>
              </div>
              {expandedFiles.has(file.filename) && file.patch && (
                <div className="border-t border-gray-200 overflow-x-auto">
                  <pre className="p-4 text-xs font-mono bg-gray-50">
                    {file.patch.split('\n').map((line, i) => (
                      <div
                        key={i}
                        className={`${
                          line.startsWith('+') && !line.startsWith('+++') ? 'bg-green-100 text-green-800' :
                          line.startsWith('-') && !line.startsWith('---') ? 'bg-red-100 text-red-800' :
                          line.startsWith('@@') ? 'bg-blue-100 text-blue-800' : ''
                        }`}
                      >
                        {line}
                      </div>
                    ))}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'commits' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 text-center text-gray-500">
            <p>Commits view coming soon</p>
            <a href={pr.html_url + '/commits'} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
              View commits on GitHub
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PRReview;
