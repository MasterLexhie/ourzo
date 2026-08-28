import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Tokens } from '@/types/auth.types';
import { apiClient } from '@/services';

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, tokens: Tokens) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user: User, tokens: Tokens) => {
        apiClient.setAccessToken(tokens.accessToken);
        set({ user, tokens, isAuthenticated: true, isLoading: false });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false });
      },

      clearAuth: () => {
        apiClient.setAccessToken(null);
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      initializeAuth: async () => {
        const { tokens } = get();
        if (!tokens?.accessToken) {
          set({ isLoading: false });
          return;
        }

        apiClient.setAccessToken(tokens.accessToken);

        try {
          const user = await apiClient.get<User>('/api/auth/me');
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          // Token might be expired, try to refresh
          if (tokens.refreshToken) {
            try {
              const response = await apiClient.post<{ accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: number }>(
                '/api/auth/refresh',
                { refreshToken: tokens.refreshToken },
              );
              const newTokens = {
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                tokenType: response.tokenType,
                expiresIn: response.expiresIn,
              };
              apiClient.setAccessToken(newTokens.accessToken);
              const user = await apiClient.get<User>('/api/auth/me');
              set({ user, tokens: newTokens, isAuthenticated: true, isLoading: false });
            } catch {
              // Refresh failed, clear auth
              get().clearAuth();
            }
          } else {
            get().clearAuth();
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);