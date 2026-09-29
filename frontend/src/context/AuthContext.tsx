/**
 * AuthContext.tsx - Signed-in user and account actions.
 *
 * On load the session is restored if either stored token is still valid (an expired
 * access token is renewed by the axios interceptor). `loading` starts as true so
 * route guards wait for that check instead of redirecting a signed-in user to /login.
 * Tokens are only discarded when the server rejects them, never on network errors.
 */

import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import toast from 'react-hot-toast';
import {
  authApi, type ChangePasswordData, type LoginCredentials, type ProfileUpdateData, type RegisterData,
} from '../api/authApi';
import { tokenService } from '../services/tokenService';
import { getApiErrorMessage, getApiErrorStatus } from '../utils/helpers';
import type { AppUser } from '../types';
import type { ContextResponse } from '../types/api';

interface AuthState {
  isAuthenticated: boolean;
  user: AppUser | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'SESSION_STARTED'; user: AppUser }
  | { type: 'SESSION_ENDED' }
  | { type: 'USER_UPDATED'; user: AppUser };

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<ContextResponse<void>>;
  register: (data: RegisterData) => Promise<ContextResponse<void>>;
  logout: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<ContextResponse<void>>;
  changePassword: (data: ChangePasswordData) => Promise<ContextResponse<void>>;
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SESSION_STARTED':
      return { isAuthenticated: true, user: action.user, loading: false };
    case 'SESSION_ENDED':
      return { isAuthenticated: false, user: null, loading: false };
    case 'USER_UPDATED':
      return { ...state, user: action.user };
    default:
      return state;
  }
};

const initialState: AuthState = { isAuthenticated: false, user: null, loading: true };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const restoreSession = async () => {
      if (!tokenService.hasSession()) {
        tokenService.clearTokens();
        dispatch({ type: 'SESSION_ENDED' });
        return;
      }
      try {
        const { user } = await authApi.getProfile();
        dispatch({ type: 'SESSION_STARTED', user });
      } catch (error) {
        if (getApiErrorStatus(error) === 401) {
          tokenService.clearTokens();
        } else {
          toast.error(getApiErrorMessage(error, 'Could not restore your session'));
        }
        dispatch({ type: 'SESSION_ENDED' });
      }
    };
    void restoreSession();
  }, []);

  const startSession = useCallback(
    async (request: () => ReturnType<typeof authApi.login>, successMessage: string, fallback: string) => {
      try {
        const { access_token, refresh_token, user } = await request();
        tokenService.setTokens(access_token, refresh_token);
        dispatch({ type: 'SESSION_STARTED', user });
        toast.success(successMessage);
        return { success: true, data: undefined } as const;
      } catch (error) {
        const message = getApiErrorMessage(error, fallback);
        toast.error(message);
        return { success: false, error: message } as const;
      }
    },
    []
  );

  const login = (credentials: LoginCredentials) =>
    startSession(() => authApi.login(credentials), 'Login successful!', 'Login failed');

  const register = (data: RegisterData) =>
    startSession(() => authApi.register(data), 'Registration successful!', 'Registration failed');

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // The tokens are discarded below either way; they expire on their own
    }
    tokenService.clearTokens();
    dispatch({ type: 'SESSION_ENDED' });
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data: ProfileUpdateData): Promise<ContextResponse<void>> => {
    try {
      const { user } = await authApi.updateProfile(data);
      dispatch({ type: 'USER_UPDATED', user });
      toast.success('Profile updated successfully!');
      return { success: true, data: undefined };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Profile update failed');
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (data: ChangePasswordData): Promise<ContextResponse<void>> => {
    try {
      // Other sessions are signed out; this one continues with the new tokens
      const { access_token, refresh_token } = await authApi.changePassword(data);
      tokenService.setTokens(access_token, refresh_token);
      toast.success('Password changed. Other devices have been signed out.');
      return { success: true, data: undefined };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Password change failed');
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value: AuthContextValue = { ...state, login, register, logout, updateProfile, changePassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
