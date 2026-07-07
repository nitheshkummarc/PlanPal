/**
 * ThemeContext.jsx - Theme Management Context Provider
 * 
 * Why: Manages dark/light theme toggle with localStorage persistence
 * 
 * Methods/Hooks:
 * - Dark/Light theme toggle
 * - Persists theme preference in localStorage
 * - Respects system theme preference on first load
 * - Automatically applies theme to document root
 * - Tailwind CSS dark mode class management
 * 
 * State:
 * - isDark: Boolean indicating if dark mode is active
 * - theme: String 'dark' or 'light'
 * 
 * Methods:
 * - toggleTheme(): Switch between dark and light modes
 * 
 * Theme Application:
 * - Adds/removes 'dark' class to document.documentElement
 * - Works with Tailwind CSS dark: variant
 * - Persists preference across browser sessions
 * 
 * Initial Theme Selection:
 * 1. Check localStorage for saved preference
 * 2. Fall back to system preference (prefers-color-scheme)
 * 3. Default to light if neither available
 * 
 * Usage:
 *   const { isDark, toggleTheme, theme } = useTheme();
 *   <button onClick={toggleTheme}>Toggle Theme</button>
 * 
 * Dependencies:
 * - React Context API
 * - localStorage for persistence
 * - window.matchMedia for system preference
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const value = {
    isDark,
    toggleTheme,
    theme: isDark ? 'dark' : 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
