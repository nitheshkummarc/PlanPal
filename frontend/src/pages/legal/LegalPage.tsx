/**
 * LegalPage.tsx - Shared layout for the Privacy Policy and Terms pages
 */

import React from 'react';
import { Link } from 'react-router-dom';

// Where users can reach the maintainer (the project's public repository)
export const CONTACT_URL = 'https://github.com/nitheshkummarc/PlanPal/issues';
export const LAST_UPDATED = 'September 25, 2026';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

const LegalPage = ({ title, children }: LegalPageProps) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-10 text-gray-700 dark:text-gray-300 space-y-6 leading-relaxed">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Last updated: {LAST_UPDATED}</p>
        </header>
        {children}
        <footer className="pt-6 border-t border-gray-200 dark:border-gray-700 text-sm">
          See also:{' '}
          <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>
          {' · '}
          <Link to="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms and Conditions</Link>
        </footer>
      </article>
    </div>
  </div>
);

/** Section heading + body used by both legal pages */
export const LegalSection = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{heading}</h2>
    {children}
  </section>
);

export default LegalPage;
