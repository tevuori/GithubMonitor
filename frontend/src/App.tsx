import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Repositories from './pages/Repositories';
import Commits from './pages/Commits';
import PullRequests from './pages/PullRequests';
import Issues from './pages/Issues';
import Branches from './pages/Branches';
import Workflows from './pages/Workflows';
import Contributors from './pages/Contributors';
import Login from './pages/Login';
import PRReview from './pages/PRReview';
import CodeSearch from './pages/CodeSearch';
import FileBrowser from './pages/FileBrowser';
import Traffic from './pages/Traffic';
import Organization from './pages/Organization';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-blue"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="repositories" element={<Repositories />} />
                <Route path="commits" element={<Commits />} />
                <Route path="pull-requests" element={<PullRequests />} />
                <Route path="pull-requests/:owner/:repo/:pullNumber" element={<PRReview />} />
                <Route path="issues" element={<Issues />} />
                <Route path="branches" element={<Branches />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="contributors" element={<Contributors />} />
                <Route path="search" element={<CodeSearch />} />
                <Route path="files" element={<FileBrowser />} />
                <Route path="traffic" element={<Traffic />} />
                <Route path="organization" element={<Organization />} />
              </Route>
            </Routes>
          </div>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;