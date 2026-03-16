import React, { createContext, useContext, useState, useCallback } from 'react';
import Colors, { DarkColors } from '../constants/colors';

type ThemeColors = typeof Colors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const colors = isDark ? DarkColors : Colors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Use this hook anywhere in the app to get themed colors + toggle */
export function useTheme() {
  return useContext(ThemeContext);
}
