import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      const raw = response.data as any;

      // Map GitHub profile payload from passport-github2 to our User shape
      const mapped: User = {
        id: raw.id,
        username: raw.username || raw.login,
        displayName: raw.displayName || raw.username || raw.login,
        avatarUrl:
          raw.avatarUrl ||
          (Array.isArray(raw.photos) && raw.photos.length > 0 ? raw.photos[0].value : undefined) ||
          raw._json?.avatar_url,
        profileUrl: raw.profileUrl || raw.profileUrl || raw._json?.html_url,
      };

      setUser(mapped);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = 'http://localhost:3000/auth/github';
  };

  const logout = async () => {
    try {
      await api.get('/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
