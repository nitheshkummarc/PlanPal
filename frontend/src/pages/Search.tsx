/**
 * Search.tsx - Search events (past and upcoming) and people.
 * People are matched by name, username, bio, or by interests when tags are selected.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { searchApi, type SearchType } from '../api/searchApi';
import type { EventSort } from '../api/eventsApi';
import { tagsApi } from '../api/tagsApi';
import EventCard from '../components/ui/EventCard';
import UserCard from '../components/ui/UserCard';
import { useApi, useDebounce } from '../hooks/useApi';
import type { AppTag } from '../types';

const RESULT_LIMIT = 50;  // per type; the search API does not page

const TABS: { id: SearchType; name: string; icon: typeof MagnifyingGlassIcon }[] = [
  { id: 'all', name: 'All', icon: MagnifyingGlassIcon },
  { id: 'events', name: 'Events', icon: CalendarDaysIcon },
  { id: 'users', name: 'People', icon: UserIcon },
];

const parseTab = (value: string | null): SearchType =>
  value === 'events' || value === 'users' ? value : 'all';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<SearchType>(parseTab(searchParams.get('type')));
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [sortBy, setSortBy] = useState<EventSort>(searchParams.get('sort_by') === 'created_at' ? 'created_at' : 'date');
  const [tagIds, setTagIds] = useState<string[]>(searchParams.get('tag_ids')?.split(',').filter(Boolean) || []);
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<AppTag[]>([]);

  const debouncedQuery = useDebounce(query.trim(), 400);
  const debouncedLocation = useDebounce(location.trim(), 400);
  const { data, loading, execute: runSearch, reset } = useApi(searchApi.search);
  const hasCriteria = !!(debouncedQuery || tagIds.length || debouncedLocation);

  useEffect(() => {
    tagsApi.getAllTags().then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (activeTab !== 'all') params.set('type', activeTab);
    if (debouncedLocation) params.set('location', debouncedLocation);
    if (tagIds.length) params.set('tag_ids', tagIds.join(','));
    if (sortBy !== 'date') params.set('sort_by', sortBy);
    setSearchParams(params, { replace: true });

    if (!hasCriteria) {
      reset();
      return;
    }
    runSearch(debouncedQuery, {
      type: activeTab,
      limit: RESULT_LIMIT,
      location: debouncedLocation || undefined,
      tag_ids: tagIds.length ? tagIds.join(',') : undefined,
      sort_by: sortBy,
    }).catch(() => undefined);  // useApi shows the error
  }, [debouncedQuery, debouncedLocation, activeTab, sortBy, tagIds, hasCriteria, runSearch, reset, setSearchParams]);

  const toggleTag = (tagId: string) =>
    setTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));

  const hasFilters = !!(location || tagIds.length || sortBy !== 'date');
  const clearFilters = () => {
    setLocation('');
    setTagIds([]);
    setSortBy('date');
  };

  const events = data?.results.events ?? [];
  const users = data?.results.users ?? [];
  const resultCount = events.length + users.length;
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Find events (including past ones) and people</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-6">
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for events or people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <button onClick={clearFilters} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Clear filters</button>
            )}
          </div>

          {showFilters && (
            <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event location</label>
                  <input type="text" placeholder="Venue, city or state" value={location}
                    onChange={(e) => setLocation(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort events by</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as EventSort)} className={inputClass}>
                    <option value="date">Upcoming first</option>
                    <option value="created_at">Newest</option>
                  </select>
                </div>
              </div>
              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags (event categories and people's interests)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.tag_id}
                        type="button"
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

        <nav className="flex space-x-8 mb-6" aria-label="Result type">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>

        {!hasCriteria ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Start your search</h3>
            <p className="text-gray-600 dark:text-gray-400">Enter keywords, a location, or select tags</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 animate-pulse" />)}
          </div>
        ) : resultCount === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try different keywords or adjust your filters</p>
          </div>
        ) : (
          <>
            {events.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Events ({events.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => <EventCard key={event.event_id} event={event} />)}
                </div>
              </section>
            )}
            {users.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">People ({users.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map((user) => <UserCard key={user.user_id} user={user} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
