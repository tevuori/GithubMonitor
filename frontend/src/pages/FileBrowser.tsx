import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

interface FileItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  html_url: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
}

const FileBrowser = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Get repos
  const { data: repos } = useQuery<Repository[]>({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await api.get('/api/repos');
      return res.data;
    },
  });

  // Auto-select first repo or from URL
  useEffect(() => {
    if (repos && repos.length > 0) {
      const repoParam = searchParams.get('repo');
      if (repoParam) {
        const found = repos.find(r => r.full_name === repoParam);
        if (found) {
          setSelectedRepo(found);
          return;
        }
      }
      if (!selectedRepo) {
        setSelectedRepo(repos[0]);
      }
    }
  }, [repos, searchParams, selectedRepo]);

  // Get path from URL
  useEffect(() => {
    const pathParam = searchParams.get('path');
    if (pathParam) {
      setCurrentPath(pathParam);
    }
  }, [searchParams]);

  // Fetch directory contents
  const { data: contents, isLoading: contentsLoading } = useQuery({
    queryKey: ['contents', selectedRepo?.full_name, currentPath],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const res = await api.get(`/api/files/${selectedRepo.owner.login}/${selectedRepo.name}/contents`, {
        params: { path: currentPath },
      });
      return Array.isArray(res.data) ? res.data : [res.data];
    },
    enabled: !!selectedRepo,
  });

  // Fetch file content when a file is selected
  const { data: fileContent, isLoading: fileLoading } = useQuery({
    queryKey: ['file', selectedRepo?.full_name, selectedFile?.path],
    queryFn: async () => {
      if (!selectedRepo || !selectedFile) return null;
      const res = await api.get(`/api/files/${selectedRepo.owner.login}/${selectedRepo.name}/file`, {
        params: { path: selectedFile.path },
      });
      return res.data;
    },
    enabled: !!selectedRepo && !!selectedFile,
  });

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
    setSearchParams({ repo: selectedRepo?.full_name || '', path });
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'dir') {
      navigateTo(item.path);
    } else {
      setSelectedFile(item);
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'dir') {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
      html: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml', yml: 'yaml',
      md: 'markdown', sh: 'bash', sql: 'sql',
    };
    return langMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="space-y-6" data-testid="file-browser-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">File Browser</h1>
        <select
          value={selectedRepo?.full_name || ''}
          onChange={(e) => {
            const repo = repos?.find(r => r.full_name === e.target.value);
            setSelectedRepo(repo || null);
            setCurrentPath('');
            setSelectedFile(null);
            setSearchParams({ repo: e.target.value, path: '' });
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="repo-selector"
        >
          {repos?.map((repo) => (
            <option key={repo.id} value={repo.full_name}>
              {repo.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white rounded-lg shadow px-4 py-3">
        <nav className="flex items-center gap-2 text-sm">
          <button
            onClick={() => navigateTo('')}
            className="text-blue-600 hover:underline font-medium"
          >
            {selectedRepo?.name || 'root'}
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-gray-400">/</span>
              <button
                onClick={() => navigateTo(breadcrumbs.slice(0, i + 1).join('/'))}
                className="text-blue-600 hover:underline"
              >
                {crumb}
              </button>
            </span>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-medium text-gray-700">
            Files
          </div>
          {contentsLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {currentPath && (
                <button
                  onClick={() => navigateTo(breadcrumbs.slice(0, -1).join('/'))}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  <span className="text-gray-600">..</span>
                </button>
              )}
              {contents?.sort((a: FileItem, b: FileItem) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'dir' ? -1 : 1;
              }).map((item: FileItem) => (
                <button
                  key={item.sha}
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left ${
                    selectedFile?.path === item.path ? 'bg-blue-50' : ''
                  }`}
                >
                  {getFileIcon(item)}
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.type === 'file' && (
                    <span className="text-xs text-gray-400">
                      {item.size > 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* File Content */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          {selectedFile ? (
            <>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="font-medium text-gray-700 truncate">{selectedFile.name}</div>
                <a
                  href={selectedFile.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View on GitHub
                </a>
              </div>
              {fileLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : fileContent?.decodedContent ? (
                <div className="overflow-auto max-h-[600px]">
                  <pre className="p-4 text-sm font-mono bg-gray-50">
                    {fileContent.decodedContent.split('\n').map((line: string, i: number) => (
                      <div key={i} className="flex hover:bg-yellow-50">
                        <span className="select-none text-gray-400 pr-4 text-right w-12">
                          {i + 1}
                        </span>
                        <code>{line}</code>
                      </div>
                    ))}
                  </pre>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Unable to display file content
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Select a file to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileBrowser;
