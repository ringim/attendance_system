import { create } from 'zustand';
import { authAPI } from '../services/api';

/**
 * Authentication Store
 * Manages user authentication state
 */
export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  /**
   * Login user
   */
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Login failed',
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /**
   * Verify token
   */
  verifyAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return false;
    }

    try {
      await authAPI.verifyToken();
      return true;
    } catch (error) {
      set({ isAuthenticated: false, user: null, token: null });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  },

  /**
   * Get user profile
   */
  getProfile: async () => {
    try {
      const response = await authAPI.getProfile();
      const user = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
      
      return user;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));
