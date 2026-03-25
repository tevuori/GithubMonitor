import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string;
    type: string;
    latest_comment_url: string | null;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      avatar_url: string;
    };
    html_url: string;
  };
  url: string;
}

const Notifications = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'participating'>('unread');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications', filter, reasonFilter],
    queryFn: async () => {
      const params: any = {};
      if (filter === 'all') params.all = 'true';
      if (filter === 'participating') params.participating = 'true';
      if (reasonFilter !== 'all') params.reason = reasonFilter;
      const res = await api.get('/api/notifications', { params });
      return res.data;
    },
  });

  const reasons = useMemo(() => {
    const set = new Set<string>();
    (notifications || []).forEach(n => set.add(n.reason));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notifications]);

  // Load thread details (raw GitHub thread)
  const {
    data: thread,
    isLoading: threadLoading,
    error: threadError,
  } = useQuery<any>({
    queryKey: ['notificationThread', selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return null;
      const res = await api.get(`/api/notifications/thread/${selectedThreadId}`);
      return res.data;
    },
    enabled: !!selectedThreadId,
  });

  // Mark single as read
  const markAsReadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      await api.patch(`/api/notifications/thread/${threadId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Marked as read');
    },
    onError: () => {
      toast.error('Failed to mark as read');
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/api/notifications/read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all notifications as read');
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Issue':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'PullRequest':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'Commit':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v6M12 15v6" />
          </svg>
        );
      case 'Release':
        return (
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'Discussion':
        return (
          <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      assign: 'Assigned',
      author: 'Author',
      comment: 'Commented',
      ci_activity: 'CI Activity',
      invitation: 'Invited',
      manual: 'Subscribed',
      mention: 'Mentioned',
      review_requested: 'Review Requested',
      security_alert: 'Security Alert',
      state_change: 'State Changed',
      subscribed: 'Watching',
      team_mention: 'Team Mentioned',
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'review_requested': return 'bg-purple-100 text-purple-700';
      case 'mention': return 'bg-blue-100 text-blue-700';
      case 'assign': return 'bg-green-100 text-green-700';
      case 'security_alert': return 'bg-red-100 text-red-700';
      case 'ci_activity': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get GitHub URL from API URL
  const getGitHubUrl = (notification: Notification) => {
    const repoUrl = notification.repository.html_url;
    const type = notification.subject.type;

    const match = notification.subject.url?.match(/\/(\d+)$/);
    const number = match ? match[1] : null;

    if (type === 'Issue' && number) return `${repoUrl}/issues/${number}`;
    if (type === 'PullRequest' && number) return `${repoUrl}/pull/${number}`;
    if (type === 'Release') return `${repoUrl}/releases`;
    if (type === 'Discussion' && number) return `${repoUrl}/discussions/${number}`;
    if (type === 'Commit') {
      const sha = notification.subject.url?.split('/').pop();
      return sha ? `${repoUrl}/commit/${sha}` : repoUrl;
    }
    return repoUrl;
  };

  // Filter by type
  const filteredNotifications = (notifications?.filter((n) => {
    if (typeFilter === 'all') return true;
    return n.subject.type === typeFilter;
  }) || []);

  const unreadCount = notifications?.filter((n) => n.unread).length || 0;

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-full text-sm font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
            data-testid="mark-all-read-btn"
          >
            {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
            <div className="flex gap-2">
              {(['unread', 'all', 'participating'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setSelectedThreadId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setSelectedThreadId(null);
              }}
            >
              <option value="all">All Types</option>
              <option value="Issue">Issues</option>
              <option value="PullRequest">Pull Requests</option>
              <option value="Commit">Commits</option>
              <option value="Release">Releases</option>
              <option value="Discussion">Discussions</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setSelectedThreadId(null);
              }}
            >
              <option value="all">All reasons</option>
              {reasons.map((r) => (
                <option key={r} value={r}>{getReasonLabel(r)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${selectedThreadId ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    notification.unread ? 'bg-blue-50/50' : ''
                  } ${selectedThreadId === notification.id ? 'ring-1 ring-blue-300' : ''}`}
                  onClick={() => setSelectedThreadId(notification.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getTypeIcon(notification.subject.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={getGitHubUrl(notification)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {notification.subject.title}
                        </a>
                        {notification.unread && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <img
                            src={notification.repository.owner.avatar_url}
                            alt={notification.repository.owner.login}
                            className="w-4 h-4 rounded-full"
                          />
                          <span>{notification.repository.full_name}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${getReasonColor(notification.reason)}`}>
                          {getReasonLabel(notification.reason)}
                        </span>
                        <span>{formatTime(notification.updated_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {notification.unread && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          disabled={markAsReadMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Mark as read"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <a
                        href={getGitHubUrl(notification)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Open in GitHub"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700">No notifications</h3>
              <p className="text-gray-500 mt-1">
                {filter === 'unread' ? "You're all caught up!" : 'No notifications to show.'}
              </p>
            </div>
          )}
        </div>

        {/* Details */}
        {selectedThreadId && (
          <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="notification-details">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Thread details</h2>
              <button
                onClick={() => setSelectedThreadId(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {threadLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : threadError ? (
              <div className="p-6 text-sm text-red-600">Failed to load thread details.</div>
            ) : thread ? (
              <div className="p-4 space-y-3">
                <div className="text-sm">
                  <span className="text-gray-500">Subject:</span>{' '}
                  <span className="font-medium text-gray-900">{thread?.subject?.title || '—'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className="font-mono text-gray-800">{thread?.subject?.type || '—'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Updated:</span>{' '}
                  <span className="text-gray-800">{thread?.updated_at ? new Date(thread.updated_at).toLocaleString() : '—'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Reason:</span>{' '}
                  <span className="font-mono text-gray-800">{thread?.reason || '—'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Unread:</span>{' '}
                  <span className="font-medium text-gray-800">{String(thread?.unread ?? '—')}</span>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:underline">Raw thread JSON</summary>
                  <pre className="mt-2 text-xs bg-gray-100 rounded-lg p-3 overflow-auto max-h-96">
                    {JSON.stringify(thread, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="p-6 text-sm text-gray-500">No details.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
