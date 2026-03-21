import { create } from 'zustand';

export type UserRole = 'FARMER' | 'BUYER' | 'SHOP';
export type AppLanguage = 'si' | 'ta' | 'en';

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  district: string;
  language: AppLanguage;
  fcmToken?: string;
}

interface AuthState {
  user: UserProfile | null;
  role: UserRole | null;
  language: AppLanguage;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setRole: (role: UserRole | null) => void;
  setLanguage: (language: AppLanguage) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  language: 'si',
  isLoading: false,
  setUser: (user) => set({ user, role: user?.role || null }),
  setRole: (role) => set({ role }),
  setLanguage: (language) => set({ language }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, role: null }),
}));
