import React from 'react';
import { Link } from 'react-router-dom';
import { CONTACT_URL } from '../../pages/legal/LegalPage';

const SECTIONS: { title: string; links: { name: string; to: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { name: 'Discover events', to: '/events' },
      { name: 'Search', to: '/search' },
      { name: 'Calendar', to: '/calendar' },
      { name: 'Create an event', to: '/create-event' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Privacy Policy', to: '/privacy' },
      { name: 'Terms and Conditions', to: '/terms' },
    ],
  },
];

const linkClass = 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors text-sm';

const Footer = () => (
  <footer className="bg-white dark:bg-gray-950">
    <div className="w-full px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">PlanPal</Link>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-4 max-w-sm">
            Create events, find people with the same interests, and keep track of what you're going to.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">{section.title}</h3>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">© {new Date().getFullYear()} PlanPal</p>
        <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Report an issue
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
