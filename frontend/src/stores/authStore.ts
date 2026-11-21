/**
 * Authentication Store - Zustand state management
 *
 * Manages user authentication state, login/logout actions,
 * and permission checking.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, LoginCredentials } from '../types';
import { authApi, apiErrorMessage } from '../services/api';

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface AuthState {
  /** Current authenticated user */
  user: User | null;
  /** JWT access token */
  token: string | null;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message from last operation */
  error: string | null;

  // Actions
  /** Login with username and password */
  login: (credentials: LoginCredentials) => Promise<boolean>;
  /** Register a new user */
  register: (data: RegisterData) => Promise<boolean>;
  /** Logout and clear state */
  logout: () => void;
  /** Fetch current user info */
  fetchUser: () => Promise<void>;
  /** Re-check the saved login in the background (picks up role changes) */
  refreshUser: () => Promise<void>;
  /** Check if user has required role */
  hasRole: (role: UserRole) => boolean;
  /** Check if user can edit (editor or admin) */
  canEdit: () => boolean;
  /** Check if user is admin */
  isAdmin: () => boolean;
  /** Check if user is authenticated */
  isAuthenticated: () => boolean;
  /** Clear any error messages */
  clearError: () => void;
}

/**
 * Role hierarchy for permission checking
 */
const roleHierarchy: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

/**
 * Authentication store with persistence
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          localStorage.setItem('access_token', response.access_token);
          set({ token: response.access_token });

          // Fetch user info after login
          const user = await authApi.getCurrentUser();
          set({ user, isLoading: false });
          return true;
        } catch (error: unknown) {
          // Show the server's reason (e.g. "Incorrect username or password",
          // "User account is disabled") instead of "Request failed with status code 401"
          set({ error: apiErrorMessage(error, 'Login failed'), isLoading: false });
          return false;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register(data);
          // After successful registration, log the user in
          const response = await authApi.login({ username: data.username, password: data.password });
          localStorage.setItem('access_token', response.access_token);
          set({ token: response.access_token });

          const user = await authApi.getCurrentUser();
          set({ user, isLoading: false });
          return true;
        } catch (error: unknown) {
          set({ error: apiErrorMessage(error, 'Registration failed'), isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null, error: null });
      },

      fetchUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
          set({ user: null, token: null, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.getCurrentUser();
          set({ user, token, isLoading: false });
        } catch {
          // Token invalid, clear state
          localStorage.removeItem('access_token');
          set({ user: null, token: null, isLoading: false });
        }
      },

      refreshUser: async () => {
        // Re-check the saved login in the background (no loading spinner).
        // Picks up role changes; an expired login is handled by the API
        // interceptor, which signs the user out.
        if (!localStorage.getItem('access_token')) return;
        try {
          const user = await authApi.getCurrentUser();
          set({ user });
        } catch {
          // handled by the interceptor (401) or ignored (network error)
        }
      },

      hasRole: (role: UserRole) => {
        const { user } = get();
        if (!user) return false;
        return roleHierarchy[user.role] >= roleHierarchy[role];
      },

      canEdit: () => get().hasRole('editor'),

      isAdmin: () => get().hasRole('admin'),

      isAuthenticated: () => {
        const { user, token } = get();
        return !!(user && token);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      // Persist both token and user to avoid race conditions on reload
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        // After hydration, if we have a token but no user, we need to fetch user
        // Set isLoading to true so ProtectedRoute waits
        if (state?.token && !state?.user) {
          useAuthStore.setState({ isLoading: true });
        }
      },
    }
  )
);
