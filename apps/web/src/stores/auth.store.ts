import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Tokens } from '@/types/auth.types';
import { apiClient } from '@/services';
import { useOrganizationStore } from './organization.store';

// Workspace selection is per user. Clearing it whenever the authenticated
// identity changes prevents one user's cached workspace from being shown to
// the next user on a shared browser.
const clearWorkspaceState = () => {
  useOrganizationStore.getState().clearOrganizations();
};

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _initializeAuthPromise: Promise<void> | null;
  setAuth: (user: User, tokens: Tokens) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
      _initializeAuthPromise: null,

      setAuth: (user: User, tokens: Tokens) => {
        if (get().user?.id !== user.id) {
          clearWorkspaceState();
        }
        apiClient.setAccessToken(tokens.accessToken);
        set({ user, tokens, isAuthenticated: true, isLoading: false });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false });
      },

      clearAuth: () => {
        clearWorkspaceState();
        apiClient.setAccessToken(null);
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      initializeAuth: async () => {
        const { tokens, _initializeAuthPromise } = get();

        // Return existing promise if initialization is already in progress
        if (_initializeAuthPromise) {
          return _initializeAuthPromise;
        }

        if (!tokens?.accessToken) {
          set({ isLoading: false });
          return;
        }

        const initPromise = (async () => {
          try {
            apiClient.setAccessToken(tokens.accessToken);

            const user = await apiClient.get<User>('/api/auth/me');
            set({ user, isAuthenticated: true, isLoading: false });
          } catch {
            // Token might be expired, try to refresh
            const currentTokens = get().tokens;
            if (currentTokens?.refreshToken) {
              try {
                const response = await apiClient.post<{ accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: number }>(
                  '/api/auth/refresh',
                  { refreshToken: currentTokens.refreshToken },
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
          } finally {
            // Clear the promise so future calls can retry
            set({ _initializeAuthPromise: null });
          }
        })();

        set({ _initializeAuthPromise: initPromise });
        return initPromise;
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

export { useAuthStore };