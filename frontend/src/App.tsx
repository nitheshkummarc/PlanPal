/**
 * App.tsx - Providers and routes.
 *
 * Public: /, /login, /register, /privacy, /terms, /404 (and any unknown URL).
 * Signed in: /dashboard, /events, /events/:id, /events/:id/edit, /create-event,
 * /calendar, /profile, /notifications, /search, /upcoming-events, /users/:id.
 * Admin only: /admin/tags.
 *
 * Home, Login, Register and Dashboard are in the main bundle because most visits
 * start there; every other page is loaded on demand with React.lazy.
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import { LoadingPage } from './components/ui/Loading';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';

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
const AdminTags = lazy(() => import('./pages/AdminTags'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
                <Route path="/" element={<Layout><Home /></Layout>} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
                <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />

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
                <Route
                  path="/admin/tags"
                  element={<ProtectedRoute adminOnly><Layout><AdminTags /></Layout></ProtectedRoute>}
                />

                <Route path="/404" element={<Layout><NotFound /></Layout>} />
                <Route path="*" element={<Layout><NotFound /></Layout>} />
              </Routes>
            </Suspense>

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
