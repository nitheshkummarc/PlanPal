/**
 * Calendar.tsx - The signed-in user's events (organised and joined) by month.
 * Days are the viewer's local calendar days; the month is requested from the server
 * as its exact UTC range.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon } from '@heroicons/react/24/outline';
import { eventsApi } from '../api/eventsApi';
import { LoadingSpinner } from '../components/ui/Loading';
import { formatDate, formatTime, localDateKey } from '../utils/dateUtils';
import { getApiErrorMessage, onEventsChanged } from '../utils/helpers';
import type { AppEvent } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Cells for a month grid: leading nulls for the days before the 1st, then each day. */
const monthCells = (month: Date): (Date | null)[] => {
  const year = month.getFullYear();
  const index = month.getMonth();
  const leading = new Date(year, index, 1).getDay();
  const daysInMonth = new Date(year, index + 1, 0).getDate();
  return [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, day) => new Date(year, index, day + 1)),
  ];
};

const Calendar = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadMonth = useCallback(async () => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    try {
      setEvents(await eventsApi.getAllMyEvents({ date_from: start.toISOString(), date_to: end.toISOString() }));
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load your events'));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    setLoading(true);
    void loadMonth();
    const unsubscribe = onEventsChanged(() => void loadMonth());
    const handleVisibility = () => {
      if (!document.hidden) void loadMonth();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadMonth]);

  const eventsByDay = useMemo(() => {
    const byDay = new Map<string, AppEvent[]>();
    for (const event of events) {
      const key = localDateKey(event.timestamp);
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
    return byDay;
  }, [events]);

  const todayKey = localDateKey(new Date());
  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];
  const openEvent = (event: AppEvent) => navigate(`/events/${event.event_id}`);
  const shiftMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Events you organise or joined. Select an event to see details.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg p-4 flex justify-between">
            <span>{error}</span>
            <button onClick={() => { setLoading(true); void loadMonth(); }} className="font-medium underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Previous month">
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  Today
                </button>
                <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Next month">
                  <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{day}</div>
                  ))}
                  {monthCells(month).map((date, index) => {
                    if (!date) return <div key={`blank-${index}`} className="min-h-[100px]" />;
                    const key = localDateKey(date);
                    const dayEvents = eventsByDay.get(key) ?? [];
                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={`min-h-[100px] p-1 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          key === todayKey ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                        } ${key === selectedDay ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${key === todayKey ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.event_id}
                              className={`text-xs p-1 rounded hover:opacity-80 ${
                                event.is_paid
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}
                              title={`${event.title} - ${formatTime(event.timestamp)}`}
                              onClick={(e) => { e.stopPropagation(); openEvent(event); }}
                            >
                              <div className="truncate font-medium">{event.title}</div>
                              <div className="truncate opacity-75">{formatTime(event.timestamp)}</div>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedDay ? formatDate(`${selectedDay}T00:00:00`) : 'Select a date'}
              </h3>
              {!selectedDay ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">Click on a date to see events</p>
              ) : selectedEvents.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">No events on this date</p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((event) => (
                    <div
                      key={event.event_id}
                      onClick={() => openEvent(event)}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{event.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{formatTime(event.timestamp)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{event.place}, {event.city}</p>
                        {event.is_paid && (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 mt-2">
                            Paid Event
                          </span>
                        )}
                      </div>
                      <EyeIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">This Month</h3>
              <dl className="space-y-3">
                {[
                  ['Total Events', events.length],
                  ['Days with Events', eventsByDay.size],
                  ['Paid Events', events.filter((event) => event.is_paid).length],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">{label}</dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-3">
              <button onClick={() => navigate('/create-event')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                Create Event
              </button>
              <button onClick={() => navigate('/events')} className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg">
                Browse All Events
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
