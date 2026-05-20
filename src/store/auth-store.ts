import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrentUser } from '@/lib/esport-types';

interface AuthState {
    currentUser: CurrentUser | null;
    isAuthenticated: boolean;

    // Actions
    login: (user: CurrentUser) => void;
    logout: () => void;
    initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            isAuthenticated: false,

            initialize: () => {
                // No auto-login for production
                // State persistence handles restoration
            },

            login: (user: CurrentUser) => {
                set({ currentUser: user, isAuthenticated: true });
            },

            logout: () => {
                set({ currentUser: null, isAuthenticated: false });
            }
        }),
        {
            name: 'humo_auth_user_v1',
        }
    )
);
