import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CalendarDaysIcon,
  UserGroupIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { 
  ChartBarIcon as ChartBarSolid
} from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { eventsApi } from '../api/eventsApi';
import { notificationsApi } from '../api/notificationsApi';
import UpcomingEventCard from '../components/ui/UpcomingEventCard';
import { LoadingSpinner } from '../components/ui/Loading';

const Dashboard = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    eventsJoined: 0,
    eventsCreated: 0,
    totalEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load dashboard data when auth loading is complete and user is authenticated
    if (!authLoading && isAuthenticated && user) {
      loadDashboardData();
    } else if (!authLoading && !isAuthenticated) {
      // Clear data if not authenticated
      setStats({
        eventsJoined: 0,
        eventsCreated: 0,
        totalEvents: 0
      });
      setUpcomingEvents([]);
      setNotifications([]);
      setLoading(false);
    }
  }, [authLoading, user, isAuthenticated]);

  // Listen for event updates to refresh dashboard
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleEventUpdate = () => {
      // Event update detected, refresh data
      loadDashboardData();
    };

    // Listen for custom event updates
    window.addEventListener('eventUpdated', handleEventUpdate);
    
    // Check localStorage periodically for event updates
    const intervalId = setInterval(() => {
      const updateFlag = localStorage.getItem('eventUpdated');
      if (updateFlag) {
        // Found localStorage update flag, refreshing
        loadDashboardData();
        localStorage.removeItem('eventUpdated');
      }
    }, 1000);

    return () => {
      window.removeEventListener('eventUpdated', handleEventUpdate);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated
      if (!user) {
        setStats({
          eventsJoined: 0,
          eventsCreated: 0,
          totalEvents: 0
        });
        setUpcomingEvents([]);
        setNotifications([]);
        return;
      }
      
      // Fetch all dashboard data in parallel with proper error handling
      const promises = [
        eventsApi.getMyEvents().catch(e => { 
          return { events: [] }; 
        }),
        eventsApi.getJoinedEvents().catch(e => { 
          return { events: [] }; 
        }),
        notificationsApi.getNotifications({ per_page: 5, page: 1 }).catch(e => { 
          return { notifications: [] }; 
        })
      ];

      const [createdEventsRes, joinedEventsRes, notificationsRes] = await Promise.all(promises);

      const createdEvents = createdEventsRes?.events || [];
      const joinedEvents = joinedEventsRes?.events || [];
      
      // Combine and deduplicate events
      const allEvents = [...createdEvents, ...joinedEvents];
      const uniqueEvents = Array.from(
        new Map(allEvents.map(event => [event.event_id || event.id, event])).values()
      );
      
      // Filter upcoming events
      const now = new Date();
      const upcoming = uniqueEvents
        .filter(event => new Date(event.timestamp) > now)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setUpcomingEvents(upcoming);
      
      // Calculate stats correctly:
      // - eventsJoined: events user joined but didn't create
      // - eventsCreated: events user created
      // - totalEvents: all unique events user is participating in
      const createdEventIds = new Set(createdEvents.map(e => e.event_id || e.id));
      const joinedOnlyEvents = joinedEvents.filter(e => !createdEventIds.has(e.event_id || e.id));
      
      setStats({
        eventsJoined: joinedOnlyEvents.length,
        eventsCreated: createdEvents.length,
        totalEvents: uniqueEvents.length
      });
      setNotifications(notificationsRes?.notifications || []);
    } catch (error) {
      // Set default values on error
      setStats({
        eventsJoined: 0,
        eventsCreated: 0,
        totalEvents: 0
      });
      setUpcomingEvents([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is being checked or dashboard data is being loaded
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg">
            {authLoading ? 'Checking authentication...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 shadow-2xl">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <SparklesIcon className="h-8 w-8 text-yellow-200" />
              Welcome, {user?.username || 'User'}!
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

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 flex flex-col items-center shadow-lg">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600 mb-2" />
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.eventsJoined}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Events Joined</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 flex flex-col items-center shadow-lg">
            <UserGroupIcon className="h-8 w-8 text-green-600 mb-2" />
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.eventsCreated}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Events Organized</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 flex flex-col items-center shadow-lg">
            <ChartBarSolid className="h-8 w-8 text-orange-600 mb-2" />
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.totalEvents}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
          </div>
        </div>

        {/* Main Content - Upcoming Events */}
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
            <div className={`space-y-4 ${upcomingEvents.length > 5 ? 'max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent' : ''}`}>
              {upcomingEvents.map(event => (
                <UpcomingEventCard 
                  key={event.event_id || event.id} 
                  event={event} 
                  user={user}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-medium mb-2">No upcoming events</p>
              <p className="text-sm mb-6">Create or join your first event to get started!</p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => navigate('/create-event')} 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Event
                </button>
                <button 
                  onClick={() => navigate('/events')} 
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
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

