import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchApi } from '../../api/searchApi';
import { useDebounce } from '../../hooks/useApi';

interface SearchSuggestion {
  type: 'event' | 'user' | 'query';
  id?: string;
  title?: string;
  name?: string;
  text?: string;
  subtitle?: string;
}

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      setLoading(true);
      const result = await searchApi.getSearchSuggestions(searchQuery);
      const resultSuggestions = (result as unknown as { suggestions?: SearchSuggestion[] }).suggestions || [];
      setSuggestions(resultSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery = query) => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setQuery('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
      searchRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'event') {
      navigate(`/events/${suggestion.id}`);
    } else if (suggestion.type === 'user') {
      navigate(`/users/${suggestion.id}`);
    } else {
      handleSearch(suggestion.text || '');
    }
    setShowSuggestions(false);
    setQuery('');
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
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

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    searchRef.current?.focus();
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
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
            </div>
          ) : (
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id || index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {suggestion.type === 'event' && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      )}
                      {suggestion.type === 'user' && (
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      )}
                      {suggestion.type === 'query' && (
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {suggestion.title || suggestion.name || suggestion.text}
                      </p>
                      {suggestion.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {suggestion.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs text-gray-400 capitalize">
                        {suggestion.type}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              <button
                onClick={() => handleSearch()}
                className="w-full px-4 py-2 text-left border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MagnifyingGlassIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    View all results for &quot;{query}&quot;
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;
