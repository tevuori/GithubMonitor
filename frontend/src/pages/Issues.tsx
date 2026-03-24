import React from 'react';

const Issues: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Issues</h1>
      <p className="mt-2 text-sm text-gray-600">
        Track and manage issues across repositories
      </p>
      
      <div className="mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Issue Tracker</h2>
          <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
            <p className="text-gray-500">Issue tracking dashboard will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Issues;