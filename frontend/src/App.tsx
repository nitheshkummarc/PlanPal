/**
 * App.tsx - Main Application Component
 * 
 * Why: Root component that sets up routing, authentication, theme, and layout
 * 
 * Components Used:
 * - React Router for client-side routing
 * - Authentication context for user state management
 * - Theme context for dark/light mode
 * - Protected and public route wrappers
 * - Toast notifications for user feedback
 * - Layout wrapper for consistent UI
 * 
 * Routes Structure:
 * Public Routes:
 * - /                  - Home landing page
 * - /login             - User login page
 * - /register          - User registration page
 * 
 * Protected Routes (require authentication):
 * - /dashboard         - User dashboard with overview
 * - /events            - Browse all events
 * - /events/:id        - Event details page
 * - /events/:id/edit   - Edit event (creator only)
 * - /create-event      - Create new event form
 * - /calendar          - Calendar view of events
 * - /profile           - User profile management
 * - /notifications     - User notifications center
 * - /search            - Global search page
 * - /upcoming-events   - Upcoming events list
 * 
 * Context Providers:
 * - ThemeProvider: Manages dark/light theme state
 * - AuthProvider: Manages authentication and user state
 * - Router: React Router for navigation
 * 
 * Global Components:
 * - Toaster: Hot toast notifications for user feedback
 * - Layout: Common layout wrapper (navbar, footer)
 * 
 * Dependencies:
 * - react-router-dom for routing
 * - react-hot-toast for notifications
 * - Custom contexts (AuthContext, ThemeContext)
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Search from './pages/Search';
import UpcomingEvents from './pages/UpcomingEvents';

// Styles
import './styles/index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Routes>
              {/* Public Routes */}
              <Route
                path="/"
                element={
                  <Layout>
                    <Home />
                  </Layout>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Events />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EventDetails />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events/:id/edit"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <EditEvent />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-event"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CreateEvent />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Calendar />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Profile />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Notifications />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Search />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upcoming-events"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <UpcomingEvents />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
