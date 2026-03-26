import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

interface DependabotAlert {
  number: number;
  state: string;
  dependency: {
    package: {
      ecosystem: string;
      name: string;
    };
    manifest_path: string;
  };
  security_advisory: {
    severity: string;
    summary: string;
    description: string;
    cve_id: string;
    ghsa_id: string;
  };
  security_vulnerability: {
    severity: string;
    vulnerable_version_range: string;
    first_patched_version?: { identifier: string };
  };
  created_at: string;
  html_url: string;
}

interface SecuritySummary {
  dependabot: DependabotAlert[];
  codeScanning: any[];
  secretScanning: any[];
  summary: {
    dependabot: number;
    codeScanning: number;
    secretScanning: number;
    total: number;
  };
}

const Security = () => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [alertState, setAlertState] = useState<'open' | 'fixed' | 'dismissed'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

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

  // Fetch security alerts
  const { data: security, isLoading: securityLoading, error } = useQuery<SecuritySummary>({
    queryKey: ['security', selectedRepo?.owner.login, selectedRepo?.name],
    queryFn: async () => {
      if (!selectedRepo) return { dependabot: [], codeScanning: [], secretScanning: [], summary: { dependabot: 0, codeScanning: 0, secretScanning: 0, total: 0 } };
      const res = await api.get(`/api/security/${selectedRepo.owner.login}/${selectedRepo.name}`);
      return res.data;
    },
    enabled: !!selectedRepo,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 dark:bg-gray-800 text-white';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'open': return 'text-red-600 bg-red-50';
      case 'fixed': return 'text-green-600 bg-green-50';
      case 'dismissed': return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800';
      default: return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800';
    }
  };

  // Filter dependabot alerts
  const filteredAlerts = security?.dependabot?.filter((alert) => {
    if (alertState !== 'open' && alert.state !== alertState) return false;
    if (severityFilter !== 'all' && alert.security_vulnerability?.severity?.toLowerCase() !== severityFilter) return false;
    return true;
  }) || [];

  if (reposLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="security-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="security-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">Security Alerts</h1>
      </div>

      {/* Repository selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repository</label>
        <select
          data-testid="security-repo-selector"
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

      {/* Summary Cards */}
      {security && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Alerts</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-300">{security.summary.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Dependabot</div>
            <div className="text-3xl font-bold text-amber-600">{security.summary.dependabot}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Code Scanning</div>
            <div className="text-3xl font-bold text-blue-600">{security.summary.codeScanning}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Secret Scanning</div>
            <div className="text-3xl font-bold text-red-600">{security.summary.secretScanning}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
            <div className="flex gap-2">
              {(['open', 'fixed', 'dismissed'] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setAlertState(state)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    alertState === state ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:bg-gray-800'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dependabot Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-300">
            Dependabot Alerts ({filteredAlerts.length})
          </h2>
        </div>
        {securityLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : filteredAlerts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredAlerts.map((alert) => (
              <div key={alert.number} className="p-4 hover:bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.security_vulnerability?.severity)}`}>
                      {alert.security_vulnerability?.severity || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-300">
                        {alert.security_advisory?.summary}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStateColor(alert.state)}`}>
                        {alert.state}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {alert.dependency?.package?.name}
                      </span>
                      <span>{alert.dependency?.package?.ecosystem}</span>
                      <span>{alert.dependency?.manifest_path}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      <p className="line-clamp-2">{alert.security_advisory?.description}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>Vulnerable: {alert.security_vulnerability?.vulnerable_version_range}</span>
                      {alert.security_vulnerability?.first_patched_version && (
                        <span className="text-green-600">
                          Fix: {alert.security_vulnerability.first_patched_version.identifier}
                        </span>
                      )}
                      {alert.security_advisory?.cve_id && (
                        <span className="font-mono">{alert.security_advisory.cve_id}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <a
                      href={alert.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-800 text-sm"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No security alerts</h3>
            <p className="text-gray-500 mt-1">
              {security?.summary.total === 0 
                ? 'Great! No security vulnerabilities found.' 
                : 'No alerts match your current filters.'}
            </p>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">Note about security alerts</p>
            <p className="mt-1">
              Security alerts require admin/security access to the repository. If you don't see alerts, 
              you may need to enable Dependabot alerts in your repository settings or have appropriate permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
