/**
 * AuthContext.jsx - Authentication Context Provider
 * 
 * Why: Manages global auth state (user, tokens, login/logout) across the app
 * 
 * State:
 * - isAuthenticated: Boolean indicating if user is logged in
 * - user: Current user object with profile data
 * - loading: Loading state for async operations
 * - error: Error message for failed operations
 * 
 * Actions:
 * - LOGIN_START: Triggered when login/register begins
 * - LOGIN_SUCCESS: User authenticated successfully
 * - LOGIN_FAILURE: Authentication failed
 * - LOGOUT: User logged out
 * - UPDATE_USER: User profile updated
 * - SET_LOADING: Update loading state
 * - CLEAR_ERROR: Clear error message
 * 
 * Methods:
 * - login(credentials): Authenticate user with email and password
 * - register(userData): Create new user account
 * - logout(): Sign out current user
 * - updateProfile(profileData): Update user profile information
 * - changePassword(passwordData): Change user password
 * - clearError(): Clear authentication errors
 * 
 * Features:
 * - Automatic session restoration on page load
 * - Token management via tokenService
 * - Toast notifications for user feedback
 * - Auto-logout on invalid/expired tokens
 * - Profile synchronization with backend
 * 
 * Usage:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 * 
 * Dependencies:
 * - authApi for backend communication
 * - tokenService for JWT token management
 * - react-hot-toast for notifications
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { tokenService } from '../services/tokenService';
import toast from 'react-hot-toast';

const AuthContext = createContext();
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';
const TEST_USER = {
  user_id: '00000000-0000-0000-0000-000000000001',
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  role: 'admin',
  bio: 'Frontend preview user',
  preferences: ['Technology', 'Business'],
  is_active: true,
  created_at: new Date().toISOString(),
};

const authReducer = (state, action) => {
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
        user: { ...state.user, ...action.payload },
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app load
  useEffect(() => {

    const checkAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        if (tokenService.isAuthenticated()) {
          const response = await authApi.getProfile();
          // Backend returns { user: {...} }
          const userData = response.user || response;
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: userData },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        
        // Clear invalid tokens
        tokenService.clearTokens();
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Session expired' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const response = await authApi.login(credentials);
      
      const { access_token, refresh_token, user } = response;
      tokenService.setTokens(access_token, refresh_token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const response = await authApi.register(userData);
      
      const { access_token, refresh_token, user } = response;
      tokenService.setTokens(access_token, refresh_token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user },
      });
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
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

  const updateProfile = async (profileData) => {
    try {
      const response = await authApi.updateProfile(profileData);
      // Backend returns { message, user }
      const updatedUser = response.user || response;
      dispatch({
        type: 'UPDATE_USER',
        payload: updatedUser,
      });
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await authApi.changePassword(passwordData);
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
