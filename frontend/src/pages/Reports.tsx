import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface UserReport {
  summary: {
    totalRepos: number;
    publicRepos: number;
    privateRepos: number;
    totalStars: number;
    totalForks: number;
    openPRs: number;
    openIssues: number;
  };
  languages: Array<{ name: string; count: number }>;
  topRepos: Array<{
    name: string;
    stars: number;
    forks: number;
    language: string;
    updatedAt: string;
  }>;
  generatedAt: string;
}

interface WeeklyReport {
  period: { start: string; end: string };
  summary: {
    reposUpdated: number;
    prsCreated: number;
    issuesCreated: number;
  };
  updatedRepos: Array<{ name: string; updatedAt: string }>;
  generatedAt: string;
}

const Reports = () => {
  const [reportType, setReportType] = useState<'user' | 'weekly'>('user');

  // Fetch user report
  const { data: userReport, isLoading: userReportLoading, refetch: refetchUser } = useQuery<UserReport>({
    queryKey: ['userReport'],
    queryFn: async () => {
      const res = await api.get('/api/reports/user');
      return res.data;
    },
    enabled: reportType === 'user',
  });

  // Fetch weekly report
  const { data: weeklyReport, isLoading: weeklyReportLoading, refetch: refetchWeekly } = useQuery<WeeklyReport>({
    queryKey: ['weeklyReport'],
    queryFn: async () => {
      const res = await api.get('/api/reports/weekly');
      return res.data;
    },
    enabled: reportType === 'weekly',
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const downloadCSV = (data: any, filename: string) => {
    let csv = '';
    
    if (reportType === 'user' && userReport) {
      // Summary
      csv += 'Summary\n';
      csv += 'Metric,Value\n';
      csv += `Total Repos,${userReport.summary.totalRepos}\n`;
      csv += `Public Repos,${userReport.summary.publicRepos}\n`;
      csv += `Private Repos,${userReport.summary.privateRepos}\n`;
      csv += `Total Stars,${userReport.summary.totalStars}\n`;
      csv += `Total Forks,${userReport.summary.totalForks}\n`;
      csv += `Open PRs,${userReport.summary.openPRs}\n`;
      csv += `Open Issues,${userReport.summary.openIssues}\n`;
      csv += '\n';
      
      // Languages
      csv += 'Languages\n';
      csv += 'Language,Count\n';
      userReport.languages.forEach(l => {
        csv += `${l.name},${l.count}\n`;
      });
      csv += '\n';
      
      // Top Repos
      csv += 'Top Repositories\n';
      csv += 'Name,Stars,Forks,Language,Updated\n';
      userReport.topRepos.forEach(r => {
        csv += `${r.name},${r.stars},${r.forks},${r.language || 'N/A'},${r.updatedAt}\n`;
      });
    } else if (reportType === 'weekly' && weeklyReport) {
      csv += `Weekly Report: ${formatDate(weeklyReport.period.start)} - ${formatDate(weeklyReport.period.end)}\n\n`;
      csv += 'Summary\n';
      csv += 'Metric,Value\n';
      csv += `Repos Updated,${weeklyReport.summary.reposUpdated}\n`;
      csv += `PRs Created,${weeklyReport.summary.prsCreated}\n`;
      csv += `Issues Created,${weeklyReport.summary.issuesCreated}\n`;
      csv += '\n';
      
      csv += 'Updated Repositories\n';
      csv += 'Name,Updated At\n';
      weeklyReport.updatedRepos.forEach(r => {
        csv += `${r.name},${r.updatedAt}\n`;
      });
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">Reports & Export</h1>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setReportType('user')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-800'
            }`}
          >
            User Overview
          </button>
          <button
            onClick={() => setReportType('weekly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-800'
            }`}
          >
            Weekly Activity
          </button>
        </div>
      </div>

      {/* User Report */}
      {reportType === 'user' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300">User Overview Report</h2>
              {userReport && (
                <p className="text-xs text-gray-500">Generated: {formatDate(userReport.generatedAt)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => refetchUser()}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-800 text-sm"
              >
                Refresh
              </button>
              {userReport && (
                <>
                  <button
                    onClick={() => downloadCSV(userReport, 'github-user-report.csv')}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => downloadJSON(userReport, 'github-user-report.json')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                  >
                    Export JSON
                  </button>
                </>
              )}
            </div>
          </div>
          
          {userReportLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Generating report...</p>
            </div>
          ) : userReport ? (
            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-4">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-300">{userReport.summary.totalRepos}</div>
                    <div className="text-sm text-gray-500">Total Repos</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-amber-600">{userReport.summary.totalStars}</div>
                    <div className="text-sm text-gray-500">Total Stars</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">{userReport.summary.totalForks}</div>
                    <div className="text-sm text-gray-500">Total Forks</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">{userReport.summary.openPRs}</div>
                    <div className="text-sm text-gray-500">Open PRs</div>
                  </div>
                </div>
              </div>

              {/* Languages */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-4">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {userReport.languages.slice(0, 10).map((lang) => (
                    <div
                      key={lang.name}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-2"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-300">{lang.name}</span>
                      <span className="text-sm text-gray-500">{lang.count} repos</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Repos */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-4">Top Repositories</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Repository</th>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Stars</th>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Forks</th>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Language</th>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {userReport.topRepos.map((repo) => (
                        <tr key={repo.name} className="hover:bg-gray-50 dark:bg-gray-800">
                          <td className="px-4 py-2 text-sm font-medium text-blue-600">{repo.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">⭐ {repo.stars}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">🍴 {repo.forks}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{repo.language || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{formatDate(repo.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Weekly Report */}
      {reportType === 'weekly' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300">Weekly Activity Report</h2>
              {weeklyReport && (
                <p className="text-xs text-gray-500">
                  {formatDate(weeklyReport.period.start)} - {formatDate(weeklyReport.period.end)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => refetchWeekly()}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-800 text-sm"
              >
                Refresh
              </button>
              {weeklyReport && (
                <>
                  <button
                    onClick={() => downloadCSV(weeklyReport, 'github-weekly-report.csv')}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => downloadJSON(weeklyReport, 'github-weekly-report.json')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                  >
                    Export JSON
                  </button>
                </>
              )}
            </div>
          </div>

          {weeklyReportLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Generating report...</p>
            </div>
          ) : weeklyReport ? (
            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-4">This Week's Activity</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-4xl font-bold text-blue-600">{weeklyReport.summary.reposUpdated}</div>
                    <div className="text-sm text-blue-700 mt-1">Repositories Updated</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-4xl font-bold text-purple-600">{weeklyReport.summary.prsCreated}</div>
                    <div className="text-sm text-purple-700 mt-1">Pull Requests Created</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <div className="text-4xl font-bold text-amber-600">{weeklyReport.summary.issuesCreated}</div>
                    <div className="text-sm text-amber-700 mt-1">Issues Created</div>
                  </div>
                </div>
              </div>

              {/* Updated Repos */}
              {weeklyReport.updatedRepos.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-4">Updated Repositories</h3>
                  <div className="space-y-2">
                    {weeklyReport.updatedRepos.map((repo) => (
                      <div
                        key={repo.name}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-300">{repo.name}</span>
                        <span className="text-sm text-gray-500">{formatDate(repo.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {weeklyReport.summary.reposUpdated === 0 && 
               weeklyReport.summary.prsCreated === 0 && 
               weeklyReport.summary.issuesCreated === 0 && (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">No activity this week. Time to write some code! 💻</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">Export your data</p>
            <p className="mt-1">
              Download reports as CSV for spreadsheets or JSON for programmatic use.
              Reports are generated fresh each time you request them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
