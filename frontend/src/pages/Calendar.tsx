import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, EyeIcon } from '@heroicons/react/24/outline';
import { eventsApi } from '../api/eventsApi';
import { LoadingSpinner } from '../components/ui/Loading';
import { formatDate, formatTime } from '../utils/dateUtils';
import type { AppEvent } from '../types';

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadUserEvents();
  }, [currentDate]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eventUpdated') {
        loadUserEvents();
        localStorage.removeItem('eventUpdated');
      }
    };

    const handleEventUpdate = () => {
      loadUserEvents();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('eventUpdated', handleEventUpdate);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserEvents();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      const updateFlag = localStorage.getItem('eventUpdated');
      if (updateFlag) {
        loadUserEvents();
        localStorage.removeItem('eventUpdated');
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('eventUpdated', handleEventUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  const loadUserEvents = async () => {
    try {
      setLoading(true);
      const myEventsRes = await eventsApi.getMyEvents();
      const joinedEventsRes = await eventsApi.getJoinedEvents();
      const allEvents = [...((myEventsRes as any).events || []), ...((joinedEventsRes as any).events || [])];
      const uniqueEvents = Array.from(new Map(allEvents.map((e: any) => [e.event_id, e])).values());

      const startDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
      const endDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999));

      const filteredEvents = uniqueEvents.filter((event: any) => {
        const eventDate = new Date(event.timestamp);
        const isInRange = eventDate >= startDate && eventDate <= endDate;
        return isInRange;
      });
      setEvents(filteredEvents as AppEvent[]);
    } catch (error) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];

    const eventsForDate = events.filter((event: any) => {
      const eventDate = new Date(event.timestamp);
      const matches = (
        eventDate.getUTCFullYear() === date.getFullYear() &&
        eventDate.getUTCMonth() === date.getMonth() &&
        eventDate.getUTCDate() === date.getDate()
      );
      return matches;
    });
    return eventsForDate;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.toDateString() === date2.toDateString();
  };

  const handleEventClick = (event: AppEvent, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    navigate(`/events/${(event as any).event_id || (event as any).id}`);
  };

  const getEventTypeColor = (event: any) => {
    if (event.is_paid) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Event Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View your events in calendar format and click on any event to see details
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-1">
                      {dayNames.map(day => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          {day}
                        </div>
                      ))}

                      {days.map((date, index) => {
                        const dayEvents = getEventsForDate(date);
                        return (
                          <div
                            key={index}
                            className={`min-h-[100px] p-1 border border-gray-200 dark:border-gray-700 ${
                              date ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                            } ${
                              isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                            } ${
                              selectedDate && isSameDay(date, selectedDate) ? 'ring-2 ring-blue-500' : ''
                            } transition-colors`}
                            onClick={() => date && setSelectedDate(date)}
                          >
                            {date && (
                              <>
                                <div className={`text-sm font-medium mb-1 ${
                                  isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                                }`}>
                                  {date.getDate()}
                                </div>
                                <div className="space-y-1">
                                  {dayEvents.slice(0, 3).map((event: any) => (
                                    <div
                                      key={event.event_id || event.id}
                                      className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getEventTypeColor(event)}`}
                                      title={`${event.title} - ${formatTime(event.timestamp)} - Click to view details`}
                                      onClick={(e) => handleEventClick(event, e)}
                                    >
                                      <div className="truncate font-medium">{event.title}</div>
                                      <div className="truncate opacity-75">{formatTime(event.timestamp)}</div>
                                    </div>
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <div
                                      className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                                      onClick={() => setSelectedDate(date)}
                                    >
                                      +{dayEvents.length - 3} more
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {selectedDate ? formatDate(selectedDate.toISOString()) : 'Select a date'}
                </h3>

                {selectedDate ? (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map((event: any) => (
                      <div
                        key={event.event_id || event.id}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {event.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {formatTime(event.timestamp)}
                            </p>
                            {(event.location || (event as any).place) && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                📍 {(event as any).place || event.location}
                              </p>
                            )}
                            {(event as any).is_paid && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 mt-2">
                                Paid Event
                              </span>
                            )}
                          </div>
                          <EyeIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                    ))}

                    {getEventsForDate(selectedDate).length === 0 && (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                        No events on this date
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                    Click on a date to see events
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  This Month
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Events</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{events.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Days with Events</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {new Set(events.map(event => {
                        const d = new Date(event.timestamp);
                        return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
                      })).size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Paid Events</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {events.filter((event: any) => event.is_paid).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/create-event')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Create Event
                  </button>
                  <button
                    onClick={() => navigate('/events')}
                    className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Browse All Events
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
