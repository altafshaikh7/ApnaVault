import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/apiClient.js';
import type { User } from '../types/user.js';
import type { ApiResponse } from '../types/api.js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ emailDelivery?: { delivered: boolean; reason?: string } }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize CSRF token and check current session
  const initializeAuth = useCallback(async () => {
    try {
      // 1. Fetch CSRF token
      try {
        const csrfRes = await apiClient.get<ApiResponse<{ csrfToken: string }>>('/auth/csrf-token');
        if (csrfRes?.data?.csrfToken) {
          apiClient.setCsrfToken(csrfRes.data.csrfToken);
        }
      } catch {
        // CSRF endpoint error fallback
      }

      // 2. Fetch current session user
      const meRes = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
      if (meRes?.success && meRes.data?.user) {
        setUser(meRes.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await apiClient.post<ApiResponse<{ user: User }>>('/auth/login', {
      email,
      password,
    });
    if (res?.data?.user) {
      setUser(res.data.user);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ emailDelivery?: { delivered: boolean; reason?: string } }> => {
    const res = await apiClient.post<
      ApiResponse<{ user: User; emailDelivery?: { delivered: boolean; reason?: string } }>
    >('/auth/register', {
      name,
      email,
      password,
    });
    if (res?.data?.user) {
      setUser(res.data.user);
    }
    return {
      emailDelivery: res.data?.emailDelivery,
    };
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
      if (res?.data?.user) {
        setUser(res.data.user);
      }
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
