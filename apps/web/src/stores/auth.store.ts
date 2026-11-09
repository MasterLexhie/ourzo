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
        const { user, _initializeAuthPromise } = get();

        // Return existing promise if initialization is already in progress
        if (_initializeAuthPromise) {
          return _initializeAuthPromise;
        }

        // No remembered user means no session to restore.
        if (!user) {
          set({ isLoading: false });
          return;
        }

        const initPromise = (async () => {
          try {
            // Tokens are never persisted: restore the session from the
            // httpOnly refresh cookie, then load the user.
            await apiClient.refreshAccessToken();
            const user = await apiClient.get<User>('/api/auth/me');
            set({ user, isAuthenticated: true, isLoading: false });
          } catch {
            get().clearAuth();
          } finally {
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
      // Only the user profile is persisted; tokens stay in memory (ADR-010).
      version: 1,
      migrate: (persisted) => ({
        user: (persisted as { user?: User | null } | undefined)?.user ?? null,
      }),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

export { useAuthStore };