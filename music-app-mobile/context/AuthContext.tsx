import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants/api';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [personalizeModalOpen, setPersonalizeModalOpen] = useState(false);

  const openPersonalize = () => setPersonalizeModalOpen(true);
  const closePersonalize = () => setPersonalizeModalOpen(false);

  // Load token from storage on mount
  useEffect(() => {
    async function loadToken() {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load token:", err);
        setLoading(false);
      }
    }
    loadToken();
  }, []);

  const checkAuth = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        await logout();
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Failed to login");
    }

    const data = await res.json();
    await AsyncStorage.setItem('token', data.access_token);
    setToken(data.access_token);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Failed to register");
    }

    const data = await res.json();
    await AsyncStorage.setItem('token', data.access_token);
    setToken(data.access_token);
  };

  const socialLogin = async (provider: string, uid: string, username: string, email: string) => {
    const res = await fetch(`${API_BASE}/auth/social-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider, uid, username, email })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Social authentication failed");
    }

    const data = await res.json();
    await AsyncStorage.setItem('token', data.access_token);
    setToken(data.access_token);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      socialLogin, 
      logout, 
      checkAuth,
      personalizeModalOpen,
      openPersonalize,
      closePersonalize
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
