import Keycloak from 'keycloak-js';
import { config } from './config';

export const keycloak = new Keycloak({
  url: config.keycloakUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
});

let initialization: Promise<boolean> | null = null;
export const initializeKeycloak = () => {
  initialization ??= keycloak.init({ onLoad: 'check-sso', checkLoginIframe: false, pkceMethod: 'S256' });
  return initialization;
};
