import React, { createContext, useContext, useEffect, useState } from 'react';
import Keycloak from 'keycloak-js';
import { setAuthToken } from '../lib/api';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'foodshare',
  clientId: 'foodshare-web'
});

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: () => void;
  logout: () => void;
  roles: string[];
  username: string;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isInitialized: false,
  login: () => {},
  logout: () => {},
  roles: [],
  username: ''
});

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [username, setUsername] = useState('');

  useEffect(() => {
    keycloak.init({ onLoad: 'check-sso', checkLoginIframe: false }).then((authenticated) => {
      setIsAuthenticated(authenticated);
      setIsInitialized(true);
      if (authenticated) {
        setAuthToken(keycloak.token ?? null);
        setRoles(keycloak.realmAccess?.roles || []);
        setUsername(keycloak.tokenParsed?.preferred_username || '');
      }
    }).catch(console.error);
    
    // Optional: Refresh token periodically
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).then((refreshed) => {
        if (refreshed) setAuthToken(keycloak.token ?? null);
      }).catch(() => keycloak.logout());
    };
  }, []);

  const login = () => keycloak.login();
  const logout = () => keycloak.logout();

  return (
    <AuthContext.Provider value={{ isAuthenticated, isInitialized, login, logout, roles, username }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
