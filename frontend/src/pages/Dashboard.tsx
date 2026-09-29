import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDaysIcon, EyeIcon, PlusIcon, SparklesIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { ChartBarIcon as ChartBarSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../api/eventsApi';
import UpcomingEventCard from '../components/ui/UpcomingEventCard';
import { LoadingSpinner } from '../components/ui/Loading';
import { getApiErrorMessage, onEventsChanged } from '../utils/helpers';
import type { AppEvent } from '../types';

interface Stats {
  organised: number;
  joined: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ organised: 0, joined: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      // Totals come from the lists' pagination; only upcoming events are loaded in full
      const [organised, joined, upcoming] = await Promise.all([
        eventsApi.getMyEvents(),
        eventsApi.getJoinedEvents(),
        eventsApi.getAllMyEvents({ upcoming: true }),
      ]);
      setStats({ organised: organised.pagination.total, joined: joined.pagination.total });
      setUpcomingEvents(upcoming);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load your events'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    // Reload when events change in this tab or another tab
    return onEventsChanged(() => void loadDashboard());
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  const statCards = [
    { label: 'Events Joined', value: stats.joined, icon: CalendarDaysIcon, color: 'text-blue-600', text: 'text-blue-700 dark:text-blue-300' },
    { label: 'Events Organised', value: stats.organised, icon: UserGroupIcon, color: 'text-green-600', text: 'text-green-700 dark:text-green-300' },
    { label: 'Total Events', value: stats.joined + stats.organised, icon: ChartBarSolid, color: 'text-orange-600', text: 'text-orange-700 dark:text-orange-300' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <SparklesIcon className="h-8 w-8 text-yellow-200" />
              Welcome, {user?.username}!
            </h1>
            <p className="text-blue-100 text-lg">Here's your latest activity</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/create-event')} className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all flex items-center gap-2 text-base">
              <PlusIcon className="h-5 w-5" /> Create Event
            </button>
            <button onClick={() => navigate('/events')} className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center gap-2 text-base">
              <EyeIcon className="h-5 w-5" /> Browse Events
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl p-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => { setLoading(true); void loadDashboard(); }} className="font-medium underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 flex flex-col items-center shadow-lg">
              <card.icon className={`h-8 w-8 mb-2 ${card.color}`} />
              <div className={`text-3xl font-bold ${card.text}`}>{card.value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDaysIcon className="h-7 w-7 text-blue-600" /> My Upcoming Events
            </h2>
            <div className="flex items-center gap-2">
              {upcomingEvents.length > 3 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {upcomingEvents.length} events
                </span>
              )}
              <Link to="/upcoming-events" className="text-blue-600 hover:underline text-sm font-medium">View All</Link>
            </div>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className={`space-y-4 ${upcomingEvents.length > 5 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
              {upcomingEvents.map((event) => <UpcomingEventCard key={event.event_id} event={event} user={user} />)}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-medium mb-2">No upcoming events</p>
              <p className="text-sm mb-6">Create or join your first event to get started!</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate('/create-event')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Create Event
                </button>
                <button onClick={() => navigate('/events')} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  Browse Events
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
