/**
 * ThemeContext.tsx - Theme Management Context Provider
 *
 * Why: Manages dark/light theme toggle with localStorage persistence
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  theme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
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

  const toggleTheme = (): void => {
    setIsDark(!isDark);
  };

  const value: ThemeContextValue = {
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

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
