import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient.js';
import type { User } from '../types/user.js';
import type { ApiResponse } from '../types/api.js';
import { AuthContext } from './authContextValue.js';

async function initializeAuth(): Promise<User | null> {
  try {
    try {
      const csrfRes = await apiClient.get<ApiResponse<{ csrfToken: string }>>('/auth/csrf-token');
      if (csrfRes?.data?.csrfToken) {
        apiClient.setCsrfToken(csrfRes.data.csrfToken);
      }
    } catch {
      // Continue session initialization if the CSRF endpoint is unavailable.
    }

    const meRes = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return meRes?.success && meRes.data?.user ? meRes.data.user : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void initializeAuth().then((initialUser) => {
      if (isActive) {
        setUser(initialUser);
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

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
