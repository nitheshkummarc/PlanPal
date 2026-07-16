import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon,
  PlusIcon,
  ArrowLeftIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../api/eventsApi';
import { LoadingSpinner } from '../components/ui/Loading';
import { formatDate, formatTime } from '../utils/dateUtils';
import type { AppEvent } from '../types';

const UpcomingEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  const loadUpcomingEvents = async () => {
    try {
      setLoading(true);

      if (!user) {
        setUpcomingEvents([]);
        return;
      }

      const [createdEventsRes, joinedEventsRes] = await Promise.all([
        eventsApi.getMyEvents().catch(() => ({ events: [] })),
        eventsApi.getJoinedEvents().catch(() => ({ events: [] }))
      ]);

      const createdEvents = (createdEventsRes as any)?.events || [];
      const joinedEvents = (joinedEventsRes as any)?.events || [];
      const allEvents = [...createdEvents, ...joinedEvents];
      const uniqueEvents = Array.from(
        new Map(allEvents.map((event: any) => [event.event_id || event.id, event])).values()
      ).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const now = new Date();
      const upcoming = uniqueEvents.filter((event: any) => new Date(event.timestamp) > now);

      setUpcomingEvents(upcoming as AppEvent[]);
    } catch (error) {
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="w-full h-full">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <CalendarDaysIcon className="h-7 w-7 text-blue-600" />
                    My Upcoming Events
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/create-event')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Create Event
                </button>
                <button
                  onClick={() => navigate('/events')}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-all"
                >
                  Browse Events
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full">
          {upcomingEvents.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {upcomingEvents.map((event: any) => (
                <div
                  key={event.event_id || event.id}
                  className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all cursor-pointer"
                  onClick={() => navigate(`/events/${event.event_id || event.id}`)}
                >
                  <div className="w-full px-6 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <CalendarDaysIcon className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 truncate">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{event.place || event.location || 'Location TBD'}</span>
                            </div>
                            {event.timestamp && (
                              <div className="flex items-center gap-2">
                                <ClockIcon className="h-4 w-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  {formatDate(event.timestamp)}  {formatTime(event.timestamp)}
                                </span>
                              </div>
                            )}
                            {event.max_participants && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                  {event.current_participants || 0}/{event.max_participants} participants
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                          (event.creator_id === user?.user_id || event.posted_by === user?.user_id)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {(event.creator_id === user?.user_id || event.posted_by === user?.user_id) ? 'Organizing' : 'Joined'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          ) : (
            <div className="min-h-[70vh] flex items-center justify-center">
              <div className="text-center py-20 max-w-md mx-auto px-6">
                <CalendarDaysIcon className="h-20 w-20 mx-auto mb-6 text-gray-400" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  No upcoming events
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You don't have any upcoming events yet. Create or join events to see them here.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => navigate('/create-event')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Create Event
                  </button>
                  <button
                    onClick={() => navigate('/events')}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-semibold transition-all"
                  >
                    Browse Events
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingEvents;
