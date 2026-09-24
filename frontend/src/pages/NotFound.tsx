/**
 * NotFound.tsx - Custom 404 page
 *
 * Shown for any URL that doesn't match a route (App.tsx '*' route), for
 * links to pages that don't exist yet (e.g. footer placeholders point to /404),
 * and for deep links that Vercel serves via index.html.
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Don't echo '/404' itself back to the user
  const requestedPath = location.pathname !== '/404' ? location.pathname : null;

  return (
    <div className="min-h-[70vh] bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <MapIcon className="h-16 w-16 text-blue-500 mx-auto mb-6" aria-hidden="true" />
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wide">404</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Page not found</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {requestedPath ? (
            <>We couldn't find <code className="px-1 rounded bg-gray-100 dark:bg-gray-800">{requestedPath}</code>. </>
          ) : (
            <>This page isn't available yet. </>
          )}
          It may have moved, or the link may be wrong.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary">
            Go home
          </Link>
          <Link to="/events" className="btn-secondary">
            Browse events
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
