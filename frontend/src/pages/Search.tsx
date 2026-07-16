import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  UserIcon,
  CalendarDaysIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { searchApi } from '../api/searchApi';
import { tagsApi } from '../api/tagsApi';
import EventCard from '../components/ui/EventCard';
import UserCard from '../components/ui/UserCard';
import TagChip from '../components/ui/TagChip';
import { useApi, usePagination, useDebounce } from '../hooks/useApi';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    sort_by: searchParams.get('sort_by') || 'relevance'
  });

  const debouncedQuery = useDebounce(query, 500);
  const pagination = usePagination(1, 20);

  const {
    data: searchResults,
    loading: searchLoading,
    execute: performSearch,
    reset: resetSearchResults
  } = useApi(searchApi.search);

  const {
    data: tagsData,
    loading: tagsLoading,
    execute: fetchTags
  } = useApi(tagsApi.getAllTags);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim() || selectedTags.length > 0) {
      handleSearch();
    } else {
      resetSearchResults();
    }
  }, [debouncedQuery, activeTab, filters, selectedTags, pagination.page]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (activeTab !== 'all') params.set('type', activeTab);
    if (filters.location) params.set('location', filters.location);
    if (filters.sort_by !== 'relevance') params.set('sort_by', filters.sort_by);

    setSearchParams(params);
  }, [debouncedQuery, activeTab, filters, setSearchParams]);

  const handleSearch = async () => {
    try {
      const searchFilters = {
        type: activeTab as 'all' | 'events' | 'users' | 'tags',
        page: pagination.page,
        limit: pagination.limit,
        location: filters.location,
        sort_by: filters.sort_by,
        tag_ids: selectedTags.map(tag => tag.tag_id || tag.id).join(',')
      };

      const searchQuery = debouncedQuery.trim() || (selectedTags.length > 0 ? '' : debouncedQuery);
      const result = await performSearch(searchQuery, searchFilters);
      pagination.setTotal((result as any)?.total || 0);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    pagination.reset();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    pagination.reset();
  };

  const handleTagToggle = (tag: any) => {
    setSelectedTags(prev => {
      const isSelected = prev.find(t => (t.tag_id || t.id) === (tag.tag_id || tag.id));
      if (isSelected) {
        return prev.filter(t => (t.tag_id || t.id) !== (tag.tag_id || tag.id));
      } else {
        return [...prev, tag];
      }
    });
    pagination.reset();
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setFilters({
      location: '',
      sort_by: 'relevance'
    });
    pagination.reset();
  };

  const tabs = [
    { id: 'all', name: 'All', icon: MagnifyingGlassIcon },
    { id: 'events', name: 'Events', icon: CalendarDaysIcon },
    { id: 'users', name: 'People', icon: UserIcon }
  ];

  const results = (searchResults as any)?.results || {};
  const events = results.events || [];
  const users = results.users || [];
  const tags = (tagsData as any)?.tags || [];

  const getResultCount = () => {
    switch (activeTab) {
      case 'events':
        return events.length;
      case 'users':
        return users.length;
      default:
        return (events.length || 0) + (users.length || 0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Find events, people, and more
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for events, people, or topics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                Filters
                {(selectedTags.length > 0 || Object.values(filters).some(v => v && v !== 'relevance')) && (
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                    Active
                  </span>
                )}
              </button>

              {(selectedTags.length > 0 || Object.values(filters).some(v => v && v !== 'relevance')) && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {showFilters && (
              <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="City or area"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sort By
                    </label>
                    <select
                      value={filters.sort_by}
                      onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="date">Date</option>
                      <option value="distance">Distance</option>
                    </select>
                  </div>
                </div>

                {!tagsLoading && tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Topics
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.slice(0, 15).map((tag: any) => (
                        <button
                          key={tag.tag_id || tag.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTagToggle(tag);
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedTags.find(t => (t.tag_id || t.id) === (tag.tag_id || tag.id))
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-800 dark:hover:text-blue-200 hover:border-blue-300 dark:hover:border-blue-600'
                          }`}
                          title={`Click to ${selectedTags.find(t => (t.tag_id || t.id) === (tag.tag_id || tag.id)) ? 'remove' : 'add'} ${tag.name} tag`}
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
        </div>

        <div className="mb-6">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-gray-600 dark:text-gray-400">
              {searchLoading ? (
                'Searching...'
              ) : (query.trim() || selectedTags.length > 0) ? (
                `${getResultCount()} results${query.trim() ? ` for "${query}"` : ''}`
              ) : (
                'Enter a search term or select tags to find results'
              )}
            </div>

            {selectedTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Filtered by:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <TagChip
                      key={tag.tag_id || tag.id}
                      tag={tag}
                      onRemove={() => handleTagToggle(tag)}
                      removable
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {searchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 animate-pulse" />
              ))}
            </div>
          ) : (query.trim() || selectedTags.length > 0) ? (
            <>
              {(activeTab === 'all' || activeTab === 'events') && events.length > 0 && (
                <div className="mb-8">
                  {activeTab === 'all' && (
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Events ({events.length})
                    </h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event: any) => (
                      <EventCard
                        key={event.id}
                        event={event}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
                <div className="mb-8">
                  {activeTab === 'all' && (
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      People ({users.length})
                    </h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((u: any) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        showActions={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {getResultCount() === 0 && (
                <div className="text-center py-12">
                  <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try different keywords or adjust your filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Start your search
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter keywords or select tags to find events, people, and topics
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
