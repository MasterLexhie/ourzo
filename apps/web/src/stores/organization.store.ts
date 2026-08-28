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

      setOrganizations: (organizations: Organization[]) => {
        set({ organizations });
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
      },
    }),
    {
      name: 'organization-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        organizations: state.organizations,
      }),
    },
  ),
);