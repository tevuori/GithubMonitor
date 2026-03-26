import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface CodeFrequency {
  week: string;
  additions: number;
  deletions: number;
}

interface CommitActivity {
  week: string;
  total: number;
  days: number[];
}

interface PunchCard {
  day: number;
  hour: number;
  commits: number;
}

interface Participation {
  all: number[];
  owner: number[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const Insights = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

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

  // Fetch code frequency
  const { data: codeFrequency, isLoading: codeFreqLoading } = useQuery<CodeFrequency[]>({
    queryKey: ['codeFrequency', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/insights/${selectedRepo.owner.login}/${selectedRepo.name}/code-frequency`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Fetch commit activity
  const { data: commitActivity, isLoading: commitActivityLoading } = useQuery<CommitActivity[]>({
    queryKey: ['commitActivity', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/insights/${selectedRepo.owner.login}/${selectedRepo.name}/commit-activity`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Fetch punch card
  const { data: punchCard, isLoading: punchCardLoading } = useQuery<PunchCard[]>({
    queryKey: ['punchCard', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/insights/${selectedRepo.owner.login}/${selectedRepo.name}/punch-card`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Fetch participation
  const { data: participation, isLoading: participationLoading } = useQuery<Participation>({
    queryKey: ['participation', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return { all: [], owner: [] };
      const res = await api.get(`/api/insights/${selectedRepo.owner.login}/${selectedRepo.name}/participation`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  // Process code frequency for chart
  const codeFrequencyData = codeFrequency?.slice(-52).map((item) => ({
    week: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    additions: item.additions,
    deletions: Math.abs(item.deletions),
  })) || [];

  // Process commit activity for chart
  const commitActivityData = commitActivity?.slice(-52).map((item) => ({
    week: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    commits: item.total,
  })) || [];

  // Process participation for chart
  const participationData = participation?.all?.slice(-52).map((commits, idx) => ({
    week: `Week ${idx + 1}`,
    all: commits,
    owner: participation.owner?.[idx] || 0,
  })) || [];

  // Process punch card for heatmap
  const punchCardMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxCommits = 0;
  punchCard?.forEach((item) => {
    punchCardMatrix[item.day][item.hour] = item.commits;
    if (item.commits > maxCommits) maxCommits = item.commits;
  });

  const getPunchCardColor = (commits: number) => {
    if (commits === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = Math.min(commits / Math.max(maxCommits, 1), 1);
    if (intensity < 0.25) return 'bg-green-200';
    if (intensity < 0.5) return 'bg-green-400';
    if (intensity < 0.75) return 'bg-green-600';
    return 'bg-green-800';
  };

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="insights-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="insights-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">Repository Insights</h1>
      </div>

      {/* Repository selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repository</label>
        <select
          data-testid="insights-repo-selector"
          className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
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

      {/* Code Frequency Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-4">Code Frequency</h2>
        {codeFreqLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : codeFrequencyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={codeFrequencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="additions" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Additions" />
              <Area type="monotone" dataKey="deletions" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Deletions" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No code frequency data available. GitHub is calculating stats...
          </div>
        )}
      </div>

      {/* Commit Activity Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-4">Commit Activity (Last Year)</h2>
        {commitActivityLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : commitActivityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={commitActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="commits" fill="#3b82f6" name="Commits" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No commit activity data available. GitHub is calculating stats...
          </div>
        )}
      </div>

      {/* Participation Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-4">Participation (Owner vs All Contributors)</h2>
        {participationLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : participationData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={participationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="all" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="All Contributors" />
              <Area type="monotone" dataKey="owner" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Owner" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No participation data available. GitHub is calculating stats...
          </div>
        )}
      </div>

      {/* Punch Card Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-4">Commit Punch Card</h2>
        <p className="text-sm text-gray-500 mb-4">Commits by day and hour (darker = more commits)</p>
        {punchCardLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : punchCard && punchCard.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Hour headers */}
              <div className="flex mb-1 ml-12">
                {HOURS.map((hour, idx) => (
                  <div key={hour} className="w-5 h-5 text-[10px] text-gray-400 text-center">
                    {idx % 3 === 0 ? hour.split(':')[0] : ''}
                  </div>
                ))}
              </div>
              {/* Days */}
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="flex items-center">
                  <div className="w-12 text-xs text-gray-500 text-right pr-2">{day}</div>
                  {HOURS.map((_, hourIdx) => (
                    <div
                      key={`${dayIdx}-${hourIdx}`}
                      className={`w-5 h-5 m-0.5 rounded-sm ${getPunchCardColor(punchCardMatrix[dayIdx][hourIdx])}`}
                      title={`${day} ${hourIdx}:00 - ${punchCardMatrix[dayIdx][hourIdx]} commits`}
                    />
                  ))}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-end mt-4 gap-2">
                <span className="text-xs text-gray-500">Less</span>
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
                <div className="w-4 h-4 bg-green-200 rounded-sm"></div>
                <div className="w-4 h-4 bg-green-400 rounded-sm"></div>
                <div className="w-4 h-4 bg-green-600 rounded-sm"></div>
                <div className="w-4 h-4 bg-green-800 rounded-sm"></div>
                <span className="text-xs text-gray-500">More</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No punch card data available. GitHub is calculating stats...
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;
