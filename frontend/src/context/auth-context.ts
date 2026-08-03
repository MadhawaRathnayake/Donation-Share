import { createContext } from 'react';
import type { Role } from '../types/domain';

export interface AuthContextValue {
  isAuthenticated: boolean;
  isInitialized: boolean;
  authError: string | null;
  roles: Role[];
  username: string;
  isMock: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  accountManagement: () => Promise<void>;
  refreshRoles: (mockRole?: Role) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
