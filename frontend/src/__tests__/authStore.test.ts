/**
 * Tests for authentication store
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../stores/authStore';

// Mock the API
vi.mock('../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    heartbeat: vi.fn(),
  },
}));

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
    localStorage.clear();
  });

  describe('Initial state', () => {
    it('should start with no user logged in', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true when token exists', () => {
      useAuthStore.setState({ token: 'test-token', user: { id: '1', username: 'test', role: 'viewer' } });
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('canEdit', () => {
    it('should return false for viewers', () => {
      useAuthStore.setState({
        token: 'test-token',
        user: { id: '1', username: 'test', email: 'test@test.com', role: 'viewer', is_active: true, created_at: '', updated_at: '' }
      });
      const { canEdit } = useAuthStore.getState();
      expect(canEdit()).toBe(false);
    });

    it('should return true for editors', () => {
      useAuthStore.setState({
        token: 'test-token',
        user: { id: '1', username: 'test', email: 'test@test.com', role: 'editor', is_active: true, created_at: '', updated_at: '' }
      });
      const { canEdit } = useAuthStore.getState();
      expect(canEdit()).toBe(true);
    });

    it('should return true for admins', () => {
      useAuthStore.setState({
        token: 'test-token',
        user: { id: '1', username: 'test', email: 'test@test.com', role: 'admin', is_active: true, created_at: '', updated_at: '' }
      });
      const { canEdit } = useAuthStore.getState();
      expect(canEdit()).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('should return false for non-admins', () => {
      useAuthStore.setState({
        token: 'test-token',
        user: { id: '1', username: 'test', email: 'test@test.com', role: 'editor', is_active: true, created_at: '', updated_at: '' }
      });
      const { isAdmin } = useAuthStore.getState();
      expect(isAdmin()).toBe(false);
    });

    it('should return true for admins', () => {
      useAuthStore.setState({
        token: 'test-token',
        user: { id: '1', username: 'test', email: 'test@test.com', role: 'admin', is_active: true, created_at: '', updated_at: '' }
      });
      const { isAdmin } = useAuthStore.getState();
      expect(isAdmin()).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear user and token', () => {
      useAuthStore.setState({
        token: 'test-token',
        user: { id: '1', username: 'test', email: 'test@test.com', role: 'admin', is_active: true, created_at: '', updated_at: '' }
      });

      const { logout } = useAuthStore.getState();
      logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { clearError } = useAuthStore.getState();
      clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
