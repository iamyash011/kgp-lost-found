import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('kgp_theme');
      if (storedTheme) {
        return storedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // Default to light mode
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('kgp_theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('kgp_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
