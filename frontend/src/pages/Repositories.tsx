import React from 'react';

const Repositories: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Repositories</h1>
      <p className="mt-2 text-sm text-gray-600">
        View and manage all your GitHub repositories
      </p>
      
      <div className="mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Repository List</h2>
              <p className="text-sm text-gray-500">All repositories will appear here</p>
            </div>
            <button className="px-4 py-2 bg-github-blue text-white text-sm font-medium rounded-md hover:bg-blue-700">
              Refresh
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
            <div className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">github-monitor-center</h3>
                  <p className="text-sm text-gray-500">A real-time dashboard for monitoring GitHub activity</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  TypeScript
                </span>
                <span className="text-sm text-gray-500">⭐ 0</span>
              </div>
            </div>
            
            <div className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">example-repo</h3>
                  <p className="text-sm text-gray-500">Example repository for demonstration</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  JavaScript
                </span>
                <span className="text-sm text-gray-500">⭐ 42</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Filters</h3>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                All
              </button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                Public
              </button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                Private
              </button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                Archived
              </button>
              <select className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md">
                <option>All Languages</option>
                <option>TypeScript</option>
                <option>JavaScript</option>
                <option>Python</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Repositories;