import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchApi, type SearchSuggestion } from '../../api/searchApi';
import { useDebounce } from '../../hooks/useApi';

const MIN_QUERY_LENGTH = 2;

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query.trim(), 300);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    let cancelled = false;  // ignore the answer if the query changed meanwhile
    setLoading(true);
    void searchApi.getSuggestions(debouncedQuery).then((results) => {
      if (cancelled) return;
      setSuggestions(results);
      setShowSuggestions(true);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const close = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    close();
    searchRef.current?.blur();
  };

  const openSuggestion = (suggestion: SearchSuggestion) => {
    navigate(suggestion.type === 'event' ? `/events/${suggestion.id}` : `/users/${suggestion.id}`);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (showSuggestions && selectedIndex >= 0) {
          openSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        searchRef.current?.blur();
        break;
    }
  };

  return (
    <div className="relative w-full max-w-lg">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search events, people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {query && (
          <button
            onClick={() => {
              close();
              searchRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Searching...</div>
          ) : (
            <div className="py-2">
              {suggestions.length === 0 && (
                <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No matches</p>
              )}
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => openSuggestion(suggestion)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${suggestion.type === 'event' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{suggestion.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{suggestion.subtitle}</p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize flex-shrink-0">{suggestion.type}</span>
                  </div>
                </button>
              ))}
              <button
                onClick={handleSearch}
                className="w-full px-4 py-2 text-left border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MagnifyingGlassIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">View all results for &quot;{query}&quot;</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {showSuggestions && <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />}
    </div>
  );
};

export default SearchBar;
