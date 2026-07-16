/**
 * AuthContext.tsx - Authentication Context Provider
 *
 * Why: Manages global auth state (user, tokens, login/logout) across the app
 *
 * State:
 * - isAuthenticated: Boolean indicating if user is logged in
 * - user: Current user object with profile data
 * - loading: Loading state for async operations
 * - error: Error message for failed operations
 *
 * Methods:
 * - login(credentials): Authenticate user with email and password
 * - register(userData): Create new user account
 * - logout(): Sign out current user
 * - updateProfile(profileData): Update user profile information
 * - changePassword(passwordData): Change user password
 * - clearError(): Clear authentication errors
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { tokenService } from '../services/tokenService';
import toast from 'react-hot-toast';
import axios from 'axios';
import type { AppUser } from '../types';
import type { ContextResponse } from '../types/api';
import type { ApiError } from '../types/api';

// --- State types ---

interface AuthState {
  isAuthenticated: boolean;
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

// --- Action types (discriminated union) ---

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AppUser } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<AppUser> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' };

// --- Context value interface ---

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
  bio?: string;
  profile_image_url?: string;
  preferences?: string[];
}

interface ProfileUpdateData {
  name?: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
  preferences?: string[];
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<ContextResponse<void>>;
  register: (userData: RegisterData) => Promise<ContextResponse<void>>;
  logout: () => Promise<void>;
  updateProfile: (profileData: ProfileUpdateData) => Promise<ContextResponse<void>>;
  changePassword: (passwordData: ChangePasswordData) => Promise<ContextResponse<void>>;
  clearError: () => void;
}

// --- Constants ---

const BYPASS_AUTH = true; // Forced to true for design preview without backend

const TEST_USER: AppUser = {
  user_id: '00000000-0000-0000-0000-000000000001',
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  role: 'admin',
  bio: 'Frontend preview user',
  profile_image_url: null,
  preferences: ['Technology', 'Business'],
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// --- Reducer ---

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: true,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

// --- Context ---

const AuthContext = createContext<AuthContextValue | null>(null);

// --- Provider ---

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        if (BYPASS_AUTH) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: TEST_USER },
          });
          return;
        }

        if (tokenService.isAuthenticated()) {
          const response = await authApi.getProfile();
          const userData = response.user;

          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: userData },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        tokenService.clearTokens();
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Session expired' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<ContextResponse<void>> => {
    try {
      dispatch({ type: 'LOGIN_START' });

      if (BYPASS_AUTH) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: TEST_USER },
        });
        toast.success('Login bypassed for UI preview!');
        return { success: true, data: undefined };
      }

      const response = await authApi.login(credentials);

      const { access_token, refresh_token, user } = response;
      tokenService.setTokens(access_token, refresh_token);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });

      toast.success('Login successful!');
      return { success: true, data: undefined };
    } catch (error) {
      let errorMessage = 'Login failed';
      if (axios.isAxiosError(error)) {
        errorMessage = (error.response?.data as ApiError | undefined)?.error ?? errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData: RegisterData): Promise<ContextResponse<void>> => {
    try {
      dispatch({ type: 'LOGIN_START' });

      if (BYPASS_AUTH) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: TEST_USER },
        });
        toast.success('Registration bypassed for UI preview!');
        return { success: true, data: undefined };
      }

      const response = await authApi.register(userData);

      const { access_token, refresh_token, user } = response;
      tokenService.setTokens(access_token, refresh_token);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });

      toast.success('Registration successful!');
      return { success: true, data: undefined };
    } catch (error) {
      let errorMessage = 'Registration failed';
      if (axios.isAxiosError(error)) {
        errorMessage = (error.response?.data as ApiError | undefined)?.error ?? errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      tokenService.clearTokens();
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData: ProfileUpdateData): Promise<ContextResponse<void>> => {
    try {
      const response = await authApi.updateProfile(profileData);
      const updatedUser = response.user;
      dispatch({
        type: 'UPDATE_USER',
        payload: updatedUser,
      });
      toast.success('Profile updated successfully!');
      return { success: true, data: undefined };
    } catch (error) {
      let errorMessage = 'Profile update failed';
      if (axios.isAxiosError(error)) {
        errorMessage = (error.response?.data as ApiError | undefined)?.error ?? errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (passwordData: ChangePasswordData): Promise<ContextResponse<void>> => {
    try {
      await authApi.changePassword(passwordData);
      toast.success('Password changed successfully!');
      return { success: true, data: undefined };
    } catch (error) {
      let errorMessage = 'Password change failed';
      if (axios.isAxiosError(error)) {
        errorMessage = (error.response?.data as ApiError | undefined)?.error ?? errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
