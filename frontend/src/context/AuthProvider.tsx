import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setAuthToken } from '../lib/api';
import { config } from '../lib/config';
import { initializeKeycloak, keycloak } from '../lib/keycloak';
import type { Role } from '../types/domain';
import { AuthContext } from './auth-context';

const appRoles: Role[] = ['Donor', 'Recipient', 'Volunteer', 'Admin'];
const validRole = (value: string): value is Role => appRoles.includes(value as Role);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const syncKeycloakState = useCallback(() => {
    setAuthToken(keycloak.token ?? null);
    setIsAuthenticated(Boolean(keycloak.authenticated));
    setRoles((keycloak.realmAccess?.roles || []).filter(validRole));
    setUsername(String(keycloak.tokenParsed?.preferred_username || ''));
  }, []);

  useEffect(() => {
    if (config.useMockAuth) {
      const storedRole = window.localStorage.getItem('foodshare-mock-role') || config.mockRole;
      setRoles(validRole(storedRole) ? [storedRole] : ['Donor']);
      setUsername('demo_user');
      setIsAuthenticated(window.localStorage.getItem('foodshare-mock-auth') === 'true');
      setIsInitialized(true);
      return;
    }

    initializeKeycloak()
      .then(() => {
        syncKeycloakState();
        setIsInitialized(true);
      })
      .catch(() => {
        setAuthError('Authentication service is unavailable. Check that Keycloak is running.');
        setIsInitialized(true);
      });

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).then(syncKeycloakState).catch(() => keycloak.logout());
    };
    keycloak.onAuthLogout = () => {
      setAuthToken(null);
      setIsAuthenticated(false);
      setRoles([]);
    };
  }, [syncKeycloakState]);

  const login = useCallback(async () => {
    setAuthError(null);
    if (config.useMockAuth) {
      window.localStorage.setItem('foodshare-mock-auth', 'true');
      setIsAuthenticated(true);
      return;
    }
    await keycloak.login({ redirectUri: window.location.origin });
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    if (config.useMockAuth) {
      window.localStorage.removeItem('foodshare-mock-auth');
      setIsAuthenticated(false);
      return;
    }
    await keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  const accountManagement = useCallback(async () => {
    if (config.useMockAuth) return;
    await keycloak.accountManagement();
  }, []);

  const refreshRoles = useCallback(async (mockRole?: Role) => {
    if (config.useMockAuth) {
      if (mockRole) {
        window.localStorage.setItem('foodshare-mock-role', mockRole);
        setRoles([mockRole]);
      }
      return;
    }
    await keycloak.updateToken(-1);
    syncKeycloakState();
  }, [syncKeycloakState]);

  const value = useMemo(() => ({ isAuthenticated, isInitialized, authError, roles, username, isMock: config.useMockAuth, login, logout, accountManagement, refreshRoles }), [accountManagement, authError, isAuthenticated, isInitialized, login, logout, refreshRoles, roles, username]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
