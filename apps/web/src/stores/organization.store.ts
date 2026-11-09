import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Organization } from '@/types/organization.types';

interface OrganizationState {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  addOrganization: (org: Organization) => void;
  updateOrganization: (org: Organization) => void;
  removeOrganization: (id: string) => void;
  setCurrentOrganization: (org: Organization | null) => void;
  clearOrganizations: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      currentOrganization: null,
      organizations: [],

      // The server list is authoritative: a selected workspace the current
      // user no longer belongs to (or one cached from a previous user) is
      // dropped in favour of the first workspace they do belong to.
      setOrganizations: (organizations: Organization[]) => {
        set((state) => {
          const current = state.currentOrganization
            ? organizations.find((o) => o.id === state.currentOrganization?.id)
            : undefined;
          return {
            organizations,
            currentOrganization: current ?? organizations[0] ?? null,
          };
        });
      },

      addOrganization: (organization: Organization) => {
        set((state) => ({
          organizations: [organization, ...state.organizations],
          currentOrganization: state.currentOrganization ?? organization,
        }));
      },

      updateOrganization: (organization: Organization) => {
        set((state) => ({
          organizations: state.organizations.map((o) =>
            o.id === organization.id ? organization : o,
          ),
          currentOrganization:
            state.currentOrganization?.id === organization.id
              ? organization
              : state.currentOrganization,
        }));
      },

      removeOrganization: (id: string) => {
        set((state) => ({
          organizations: state.organizations.filter((o) => o.id !== id),
          currentOrganization:
            state.currentOrganization?.id === id ? null : state.currentOrganization,
        }));
      },

      setCurrentOrganization: (organization: Organization | null) => {
        set({ currentOrganization: organization });
      },

      clearOrganizations: () => {
        set({ organizations: [], currentOrganization: null });
      }
    }),
    {
      name: 'organization-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && (state.organizations?.length ?? 0) > 0 && !state.currentOrganization) {
          state.currentOrganization = state.organizations[0];
        }
      },
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        organizations: state.organizations,
      }),
    },
  ),
);