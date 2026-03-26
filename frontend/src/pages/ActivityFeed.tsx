import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { io, Socket } from 'socket.io-client';

interface Event {
  id: string;
  type: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  repo: {
    name: string;
    url: string;
  };
  payload: any;
  created_at: string;
}

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  PushEvent: { icon: '⬆️', color: 'text-green-600' },
  PullRequestEvent: { icon: '🔀', color: 'text-purple-600' },
  IssuesEvent: { icon: '🐛', color: 'text-amber-600' },
  IssueCommentEvent: { icon: '💬', color: 'text-blue-600' },
  CreateEvent: { icon: '✨', color: 'text-green-500' },
  DeleteEvent: { icon: '🗑️', color: 'text-red-500' },
  WatchEvent: { icon: '⭐', color: 'text-amber-500' },
  ForkEvent: { icon: '🍴', color: 'text-purple-500' },
  ReleaseEvent: { icon: '🏷️', color: 'text-blue-500' },
  PullRequestReviewEvent: { icon: '👀', color: 'text-indigo-500' },
  PullRequestReviewCommentEvent: { icon: '📝', color: 'text-indigo-400' },
  CommitCommentEvent: { icon: '💭', color: 'text-gray-500' },
  MemberEvent: { icon: '👤', color: 'text-teal-500' },
  PublicEvent: { icon: '🌍', color: 'text-green-600' },
  GollumEvent: { icon: '📚', color: 'text-orange-500' },
};

const ActivityFeed = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial events
  const { data: initialEvents, isLoading, refetch } = useQuery<Event[]>({
    queryKey: ['receivedEvents'],
    queryFn: async () => {
      const res = await api.get('/api/profile/events');
      return res.data;
    },
  });

  // Set initial events
  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Socket.io connection for live updates
  useEffect(() => {
    if (isLive && !socketRef.current) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      socketRef.current = io(backendUrl, {
        withCredentials: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to live feed');
      });

      socketRef.current.on('activity', (event: Event) => {
        setEvents((prev) => [event, ...prev].slice(0, 100));
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from live feed');
      });
    }

    return () => {
      if (!isLive && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isLive]);

  const getEventDescription = (event: Event) => {
    const { type, payload, repo } = event;
    switch (type) {
      case 'PushEvent':
        return `pushed ${payload.size || payload.commits?.length || 1} commit(s) to ${repo.name}`;
      case 'PullRequestEvent':
        return `${payload.action} pull request #${payload.pull_request?.number} in ${repo.name}`;
      case 'IssuesEvent':
        return `${payload.action} issue #${payload.issue?.number} in ${repo.name}`;
      case 'IssueCommentEvent':
        return `commented on issue #${payload.issue?.number} in ${repo.name}`;
      case 'CreateEvent':
        return `created ${payload.ref_type} ${payload.ref || ''} in ${repo.name}`;
      case 'DeleteEvent':
        return `deleted ${payload.ref_type} ${payload.ref} from ${repo.name}`;
      case 'WatchEvent':
        return `starred ${repo.name}`;
      case 'ForkEvent':
        return `forked ${repo.name}`;
      case 'ReleaseEvent':
        return `${payload.action} release ${payload.release?.tag_name} in ${repo.name}`;
      case 'PullRequestReviewEvent':
        return `${payload.action} review on PR #${payload.pull_request?.number} in ${repo.name}`;
      case 'MemberEvent':
        return `${payload.action} member in ${repo.name}`;
      default:
        return `performed ${type.replace('Event', '')} in ${repo.name}`;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const eventTypes = [...new Set(events.map((e) => e.type))].sort();
  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <div className="space-y-6" data-testid="activity-feed-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">Activity Feed</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              isLive
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-white dark:bg-gray-800 animate-pulse' : 'bg-gray-400 dark:bg-gray-800'}`}></span>
            {isLive ? 'Live' : 'Go Live'}
          </button>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-800'
            }`}
          >
            All Events
          </button>
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                filter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <span>{EVENT_ICONS[type]?.icon || '📌'}</span>
              {type.replace('Event', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Events</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-300">{events.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Push Events</div>
          <div className="text-2xl font-bold text-green-600">
            {events.filter((e) => e.type === 'PushEvent').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">PR Events</div>
          <div className="text-2xl font-bold text-purple-600">
            {events.filter((e) => e.type === 'PullRequestEvent').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Issue Events</div>
          <div className="text-2xl font-bold text-amber-600">
            {events.filter((e) => e.type === 'IssuesEvent' || e.type === 'IssueCommentEvent').length}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300">
            Recent Activity ({filteredEvents.length})
          </h2>
          {isLive && (
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Listening for updates...
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredEvents.map((event) => {
              const eventInfo = EVENT_ICONS[event.type] || { icon: '📌', color: 'text-gray-600 dark:text-gray-300' };
              return (
                <div key={event.id} className="px-4 py-3 hover:bg-gray-50 dark:bg-gray-800 transition-colors">
                  <div className="flex items-start gap-3">
                    <img
                      src={event.actor.avatar_url}
                      alt={event.actor.login}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{eventInfo.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-300">{event.actor.login}</span>
                        <span className="text-gray-500">{getEventDescription(event)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <a
                          href={event.repo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-blue-600 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          {event.repo.name}
                        </a>
                        <span>{formatTime(event.created_at)}</span>
                      </div>

                      {/* Extra payload info */}
                      {event.type === 'PushEvent' && event.payload.commits && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          {event.payload.commits.slice(0, 3).map((commit: any, idx: number) => (
                            <div key={idx} className="truncate">
                              <span className="font-mono text-blue-600">{commit.sha?.slice(0, 7)}</span>
                              {' '}{commit.message?.split('\n')[0]}
                            </div>
                          ))}
                          {event.payload.commits.length > 3 && (
                            <div className="text-gray-400">+{event.payload.commits.length - 3} more commits</div>
                          )}
                        </div>
                      )}

                      {event.type === 'PullRequestEvent' && event.payload.pull_request && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                          <a
                            href={event.payload.pull_request.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            #{event.payload.pull_request.number}: {event.payload.pull_request.title}
                          </a>
                        </div>
                      )}

                      {event.type === 'IssuesEvent' && event.payload.issue && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                          <a
                            href={event.payload.issue.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            #{event.payload.issue.number}: {event.payload.issue.title}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No activity found</h3>
            <p className="text-gray-500 mt-1">
              {filter !== 'all' ? 'No events match your filter.' : 'No recent activity to show.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
