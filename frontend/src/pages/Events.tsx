/**
 * Events.tsx - Discover: upcoming events with search, filters and pagination.
 * Past events are found through the Search page.
 */

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { eventsApi, type EventFilters, type EventSort } from '../api/eventsApi';
import { tagsApi } from '../api/tagsApi';
import EventCard from '../components/ui/EventCard';
import { useApi, useDebounce } from '../hooks/useApi';
import { localDayEndISO, localDayStartISO } from '../utils/dateUtils';
import type { AppTag } from '../types';

const PER_PAGE = 24;

const Events = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [sortBy, setSortBy] = useState<EventSort>(searchParams.get('sort_by') === 'created_at' ? 'created_at' : 'date');
  const [tagIds, setTagIds] = useState<string[]>(searchParams.get('tag_ids')?.split(',').filter(Boolean) || []);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<AppTag[]>([]);

  const debouncedQuery = useDebounce(query.trim(), 400);
  const debouncedLocation = useDebounce(location.trim(), 400);
  const { data, loading, execute: fetchEvents } = useApi(eventsApi.getEvents);

  useEffect(() => {
    tagsApi.getAllTags().then(setTags).catch(() => setTags([]));
  }, []);

  // Any filter change starts again from the first page
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, debouncedLocation, dateFrom, dateTo, sortBy, tagIds]);

  useEffect(() => {
    const filters: EventFilters = {
      q: debouncedQuery || undefined,
      location: debouncedLocation || undefined,
      tag_ids: tagIds.length ? tagIds.join(',') : undefined,
      // Date inputs are local days; send their exact UTC boundaries
      date_from: dateFrom ? localDayStartISO(dateFrom) : undefined,
      date_to: dateTo ? localDayEndISO(dateTo) : undefined,
      sort_by: sortBy,
      page,
      per_page: PER_PAGE,
    };
    fetchEvents(filters).catch(() => undefined);  // useApi shows the error

    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (debouncedLocation) params.set('location', debouncedLocation);
    if (tagIds.length) params.set('tag_ids', tagIds.join(','));
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (sortBy !== 'date') params.set('sort_by', sortBy);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, debouncedLocation, dateFrom, dateTo, sortBy, tagIds, page, fetchEvents, setSearchParams]);

  const toggleTag = (tagId: string) =>
    setTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));

  const hasFilters = !!(query || location || dateFrom || dateTo || tagIds.length || sortBy !== 'date');
  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setDateFrom('');
    setDateTo('');
    setSortBy('date');
    setTagIds([]);
  };

  const events = data?.events ?? [];
  const pagination = data?.pagination;
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Discover Events</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">Upcoming events happening around you</p>
          </div>
          <Link
            to="/create-event"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            Create Event
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-8 border border-gray-100 dark:border-gray-700 p-6">
          <div className="relative mb-6">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search upcoming events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              Filters
              {hasFilters && (
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full text-xs">Active</span>
              )}
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Clear all</button>
            )}
          </div>

          {showFilters && (
            <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <div className="relative">
                    <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Venue, city or state" value={location}
                      onChange={(e) => setLocation(e.target.value)} className={`pl-10 ${inputClass}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                  <input type="date" value={dateTo} min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort by</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as EventSort)} className={inputClass}>
                    <option value="date">Date (soonest first)</option>
                    <option value="created_at">Newest</option>
                  </select>
                </div>
              </div>

              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.tag_id}
                        onClick={() => toggleTag(tag.tag_id)}
                        aria-pressed={tagIds.includes(tag.tag_id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                          tagIds.includes(tag.tag_id)
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-gray-600 dark:text-gray-400 mb-6">
          {loading ? 'Searching...' : `${pagination?.total ?? 0} upcoming event${pagination?.total === 1 ? '' : 's'}`}
        </div>

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => <EventCard key={event.event_id} event={event} />)}
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pagination.pages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                  disabled={page >= pagination.pages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <CalendarDaysIcon className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No upcoming events found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
              Try other filters, or <Link to="/search" className="text-blue-600 hover:underline">search past events</Link>.
            </p>
            <div className="flex gap-4 justify-center">
              {hasFilters && (
                <button onClick={clearFilters}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium">
                  Clear Filters
                </button>
              )}
              <Link to="/create-event" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
                Create Event
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
