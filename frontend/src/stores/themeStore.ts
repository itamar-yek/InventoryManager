/**
 * Theme Store - Zustand state management for dark mode
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  /** Whether dark mode is enabled */
  isDarkMode: boolean;
  /** Toggle dark mode */
  toggleDarkMode: () => void;
  /** Set dark mode explicitly */
  setDarkMode: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,

      toggleDarkMode: () => {
        set((state) => {
          const newDarkMode = !state.isDarkMode;
          // Update document class for Tailwind dark mode
          if (newDarkMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { isDarkMode: newDarkMode };
        });
      },

      setDarkMode: (isDark: boolean) => {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ isDarkMode: isDark });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply dark mode class on page load
        if (state?.isDarkMode) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
