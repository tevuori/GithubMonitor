import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

type SetupStep = 'checking' | 'setup' | 'ready';

const GithubIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

const Login: React.FC = () => {
  const { login } = useAuth();
  const [step, setStep] = useState<SetupStep>('checking');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
    SESSION_SECRET: '',
    GITHUB_CALLBACK_URL: 'http://localhost:3000/auth/github/callback',
    PORT: '8001',
    FRONTEND_URL: 'http://localhost:5173',
  });

  useEffect(() => {
    api.get('/api/env/status')
      .then(res => {
        setStep(res.data.configured ? 'ready' : 'setup');
      })
      .catch(() => setStep('ready')); // backend not reachable yet – fall through to login
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.GITHUB_CLIENT_ID || !form.GITHUB_CLIENT_SECRET || !form.SESSION_SECRET) {
      setError('Client ID, Client Secret and Session Secret are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/env/setup', form);
      setStep('ready');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="h-12 w-12 bg-gray-900 rounded-md flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">First-time Setup</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              No <code className="bg-gray-100 px-1 rounded">.env</code> file detected. Enter your GitHub OAuth credentials to get started.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
            <strong>How to get credentials:</strong>
            <ol className="mt-2 list-decimal list-inside space-y-1">
              <li>Go to <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="underline">GitHub Developer Settings</a></li>
              <li>Click <strong>New OAuth App</strong></li>
              <li>Set Homepage URL: <code className="bg-blue-100 px-1 rounded">http://localhost:5173</code></li>
              <li>Set Callback URL: <code className="bg-blue-100 px-1 rounded">http://localhost:3000/auth/github/callback</code></li>
            </ol>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">GitHub Client ID <span className="text-red-500">*</span></label>
              <input
                name="GITHUB_CLIENT_ID"
                value={form.GITHUB_CLIENT_ID}
                onChange={handleChange}
                placeholder="Ov23li..."
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">GitHub Client Secret <span className="text-red-500">*</span></label>
              <input
                name="GITHUB_CLIENT_SECRET"
                type="password"
                value={form.GITHUB_CLIENT_SECRET}
                onChange={handleChange}
                placeholder="Your client secret"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Session Secret <span className="text-red-500">*</span></label>
              <input
                name="SESSION_SECRET"
                type="password"
                value={form.SESSION_SECRET}
                onChange={handleChange}
                placeholder="A long random string"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">Any random string, e.g. output of <code>openssl rand -hex 32</code></p>
            </div>

            <details className="border border-gray-200 rounded-md">
              <summary className="px-3 py-2 text-sm text-gray-600 cursor-pointer select-none">Advanced options (optional)</summary>
              <div className="px-3 pb-3 space-y-3 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">OAuth Callback URL</label>
                  <input name="GITHUB_CALLBACK_URL" value={form.GITHUB_CALLBACK_URL} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Backend Port</label>
                  <input name="PORT" value={form.PORT} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Frontend URL</label>
                  <input name="FRONTEND_URL" value={form.FRONTEND_URL} onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>
            </details>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Continue to Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // step === 'ready'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="h-12 w-12 bg-gray-900 rounded-md flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">GitHub Monitor Center</h2>
          <p className="mt-2 text-center text-sm text-gray-600">A real-time dashboard for monitoring GitHub activity</p>
        </div>
        <div className="mt-8 space-y-6">
          <p className="text-center text-gray-600">
            Connect with your GitHub account to access repository analytics, commit tracking, and real-time monitoring.
          </p>
          <button
            onClick={login}
            className="group relative w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            <GithubIcon />
            Sign in with GitHub
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-50 text-gray-500">Features</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Repository Analytics</h3>
            </div>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-green-100 text-green-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Real-time Updates</h3>
            </div>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-purple-100 text-purple-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">CI/CD Monitoring</h3>
            </div>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-yellow-100 text-yellow-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Commit Tracking</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
