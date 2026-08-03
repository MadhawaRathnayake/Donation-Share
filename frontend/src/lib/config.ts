const readBoolean = (value: string | undefined) => value?.toLowerCase() === 'true';

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  keycloakRealm: import.meta.env.VITE_KEYCLOAK_REALM || 'foodshare',
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'foodshare-web',
  useMockApi: import.meta.env.DEV && readBoolean(import.meta.env.VITE_USE_MOCK_API),
  useMockAuth: import.meta.env.DEV && readBoolean(import.meta.env.VITE_USE_MOCK_AUTH),
  mockRole: import.meta.env.VITE_MOCK_ROLE || 'Donor',
} as const;
