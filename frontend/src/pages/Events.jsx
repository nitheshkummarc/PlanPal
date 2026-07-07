import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { eventsApi } from '../api/eventsApi';
import { searchApi } from '../api/searchApi';
import { tagsApi } from '../api/tagsApi';
import EventCard from '../components/ui/EventCard';
import TagChip from '../components/ui/TagChip';
import { LoadingSpinner } from '../components/ui/Loading';
import { useApi, useDebounce } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const Events = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedTags, setSelectedTags] = useState([]);
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    category: searchParams.get('category') || 'all',
    sort_by: searchParams.get('sort_by') || 'date'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const getTagId = (tag) => tag?.tag_id || tag?.id;

  const {
    data: eventsData,
    loading: eventsLoading,
    execute: fetchEvents
  } = useApi(searchApi.searchEvents);

  const {
    data: allEventsData,
    loading: allEventsLoading,
    execute: fetchAllEvents
  } = useApi(eventsApi.getAllEvents);

  const {
    data: tagsData,
    loading: tagsLoading,
    execute: fetchTags
  } = useApi(tagsApi.getAllTags);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [debouncedSearchQuery, selectedTags, filters]);

  useEffect(() => {
    // Update URL with current search params
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
    if (filters.location) params.set('location', filters.location);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.sort_by !== 'date') params.set('sort_by', filters.sort_by);
    
    setSearchParams(params);
  }, [debouncedSearchQuery, filters, setSearchParams]);

  const loadEvents = async () => {
    try {
      // Determine if we should use search API or events API
      const hasSearchQuery = debouncedSearchQuery && debouncedSearchQuery.trim() !== '';
      const hasFilters = selectedTags.length > 0 || filters.location || filters.date_from || filters.date_to;

      if (hasSearchQuery || hasFilters) {
        // Use search API for better text matching when there's a query or filters
        const searchParams = {
          limit: 50,
          location: filters.location,
          sort_by: filters.sort_by,
        };

        // Add tag filter if tags are selected
        if (selectedTags.length > 0) {
          searchParams.tag_ids = selectedTags.map(tag => getTagId(tag)).join(',');
        }

        // Add date filters if provided
        if (filters.date_from) searchParams.date_from = filters.date_from;
        if (filters.date_to) searchParams.date_to = filters.date_to;

        // Call the search API - useApi hook manages the state
        await fetchEvents(debouncedSearchQuery || '', searchParams);
      } else {
        // Use events API for browsing all events (no search query)
        const eventParams = {
          per_page: 50,
          sort_by: filters.sort_by || 'date',
        };

        await fetchAllEvents(eventParams);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error('Failed to load events');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => {
      const targetTagId = getTagId(tag);
      const isSelected = prev.find(t => getTagId(t) === targetTagId);
      if (isSelected) {
        return prev.filter(t => getTagId(t) !== targetTagId);
      } else {
        return [...prev, tag];
      }
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setFilters({
      location: '',
      date_from: '',
      date_to: '',
      category: 'all',
      sort_by: 'date'
    });
  };

  const events = eventsData?.results?.events || eventsData?.events || allEventsData?.events || [];
  const tags = tagsData?.tags || [];
  const isLoading = eventsLoading || allEventsLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
            <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Discover Events
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">
                  Find amazing events happening around you
                </p>
              </div>
              <Link
                to="/create-event"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusIcon className="h-5 w-5" />
                Create Event
              </Link>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-8 border border-gray-100 dark:border-gray-700">
            <div className="p-6">
              {/* Search Bar */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                  Filters
                  {(selectedTags.length > 0 || Object.values(filters).some(v => v && v !== 'all' && v !== 'date')) && (
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                      Active
                    </span>
                  )}
                </button>
                
                {(selectedTags.length > 0 || Object.values(filters).some(v => v && v !== 'all' && v !== 'date')) && (
                  <button
                    onClick={clearFilters}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Location Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location
                      </label>
                      <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="City or address"
                          value={filters.location}
                          onChange={(e) => handleFilterChange('location', e.target.value)}
                          className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        From Date
                      </label>
                      <div className="relative">
                        <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={filters.date_from}
                          onChange={(e) => handleFilterChange('date_from', e.target.value)}
                          className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        To Date
                      </label>
                      <div className="relative">
                        <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={filters.date_to}
                          onChange={(e) => handleFilterChange('date_to', e.target.value)}
                          className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sort By
                      </label>
                      <select
                        value={filters.sort_by}
                        onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="date">Date</option>
                        <option value="distance">Distance</option>
                        <option value="created_at">Newest</option>
                      </select>
                    </div>
                  </div>

                  {/* Tags Filter */}
                  {!tagsLoading && tags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Interests
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {tags.slice(0, 20).map((tag) => (
                          <button
                            key={getTagId(tag)}
                            onClick={() => handleTagToggle(tag)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              selectedTags.find(t => getTagId(t) === getTagId(tag))
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {tag.name}
                            {tag.event_count && (
                              <span className="text-xs">({tag.event_count})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="text-gray-600 dark:text-gray-400">
                {isLoading ? (
                  'Searching...'
                ) : (
                  `${events.length || 0} events found`
                )}
              </div>
              
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Filtered by:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <TagChip
                        key={getTagId(tag)}
                        tag={tag}
                        onRemove={() => handleTagToggle(tag)}
                        removable
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Events Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-80 animate-pulse" />
                ))}
              </div>
            ) : events.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {events.map((event) => (
                    <EventCard
                      key={event.id || event.event_id}
                      event={event}
                    />
                  ))}
                </div>

                {/* Pagination - Removed since Search API doesn't support server-side pagination */}
              </>
            ) : (
              <div className="text-center py-16">
                <CalendarDaysIcon className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  No events found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Try adjusting your search criteria or browse all events
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Clear Filters
                  </button>
                  <Link
                    to="/create-event"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Create Event
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

export default Events;
