/**
 * App.tsx - Main Application Component
 *
 * Why: Root component that sets up routing, authentication, theme, and layout
 *
 * Routes Structure:
 * Public Routes:
 * - /                  - Home landing page
 * - /login             - User login page
 * - /register          - User registration page
 * - /privacy           - Privacy Policy
 * - /terms             - Terms and Conditions
 * - /404 and any unknown URL - Custom "Page not found" page
 *
 * Protected Routes (require authentication):
 * - /dashboard         - User dashboard with overview
 * - /events            - Browse upcoming events
 * - /events/:id        - Event details page
 * - /events/:id/edit   - Edit event (creator only)
 * - /create-event      - Create new event form
 * - /calendar          - Calendar view of events
 * - /profile           - User profile management
 * - /notifications     - User notifications center
 * - /search            - Global search page
 * - /upcoming-events   - Upcoming events list
 * - /users/:id         - Another user's public profile
 *
 * Performance: the pages people land on first (Home, Login, Register,
 * Dashboard) are in the main bundle so they render without an extra request;
 * every other page is lazy-loaded (React.lazy) and fetched when first visited.
 * Measured with Lighthouse (mobile): this keeps first paint as fast as a single
 * bundle while cutting the JavaScript downloaded on first visit.
 *
 * Context Providers:
 * - ThemeProvider: Manages dark/light theme state
 * - AuthProvider: Manages authentication and user state
 * - Router: React Router for navigation
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout Components (small and used on every page, so loaded up front)
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import { LoadingPage } from './components/ui/Loading';

// Entry pages: loaded up front (see "Performance" above)
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';

// Other pages: each becomes its own JS chunk, fetched on first visit
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const EditEvent = lazy(() => import('./pages/EditEvent'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Search = lazy(() => import('./pages/Search'));
const UpcomingEvents = lazy(() => import('./pages/UpcomingEvents'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Styles
import './styles/index.css';

/** Wraps a page that requires login in the guard and the standard layout. */
const protectedPage = (page: React.ReactNode) => (
  <ProtectedRoute>
    <Layout>{page}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Suspense fallback={<LoadingPage />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Layout><Home /></Layout>} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
                <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
                <Route path="/events" element={protectedPage(<Events />)} />
                <Route path="/events/:id" element={protectedPage(<EventDetails />)} />
                <Route path="/events/:id/edit" element={protectedPage(<EditEvent />)} />
                <Route path="/create-event" element={protectedPage(<CreateEvent />)} />
                <Route path="/calendar" element={protectedPage(<Calendar />)} />
                <Route path="/profile" element={protectedPage(<Profile />)} />
                <Route path="/notifications" element={protectedPage(<Notifications />)} />
                <Route path="/search" element={protectedPage(<Search />)} />
                <Route path="/upcoming-events" element={protectedPage(<UpcomingEvents />)} />
                <Route path="/users/:id" element={protectedPage(<UserProfile />)} />

                {/* 404: explicit /404 (used by placeholder links) and any unknown URL */}
                <Route path="/404" element={<Layout><NotFound /></Layout>} />
                <Route path="*" element={<Layout><NotFound /></Layout>} />
              </Routes>
            </Suspense>

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
