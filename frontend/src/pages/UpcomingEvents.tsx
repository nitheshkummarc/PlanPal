import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../api/eventsApi';
import UpcomingEventCard from '../components/ui/UpcomingEventCard';
import { LoadingSpinner } from '../components/ui/Loading';
import { getApiErrorMessage, onEventsChanged } from '../utils/helpers';
import type { AppEvent } from '../types';

/** Every upcoming event the user organises or joined, soonest first. */
const UpcomingEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await eventsApi.getAllMyEvents({ upcoming: true }));
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load your events'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return onEventsChanged(() => void load());
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              aria-label="Back to dashboard"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <CalendarDaysIcon className="h-7 w-7 text-blue-600" />
                My Upcoming Events
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {events.length} event{events.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/create-event')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create Event
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg p-4 flex justify-between">
            <span>{error}</span>
            <button onClick={() => { setLoading(true); void load(); }} className="font-medium underline">Retry</button>
          </div>
        )}

        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => <UpcomingEventCard key={event.event_id} event={event} user={user} />)}
          </div>
        ) : !error && (
          <div className="text-center py-20">
            <CalendarDaysIcon className="h-20 w-20 mx-auto mb-6 text-gray-400" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No upcoming events</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create or join events to see them here.</p>
            <button
              onClick={() => navigate('/events')}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-semibold"
            >
              Browse Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;
