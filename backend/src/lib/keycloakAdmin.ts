import { env } from './env';

/**
 * Reflects a FoodShare role selection back into Keycloak (ADR-005).
 *
 * Why this exists: Member 2's SPA reads the signed-in user's roles from the
 * access token (`realm_access.roles`), and its route guards decide which
 * workspace to show from that list. So when someone picks "Donor" during
 * onboarding, the role has to reach Keycloak or the SPA will never let them
 * into the donor workspace. The frontend cannot do this itself, because that
 * would mean shipping administrative credentials to the browser; it happens
 * here, server side, which is exactly the split frontend/README.md asks for.
 *
 * Everything in this module is best-effort. If Keycloak is unreachable or the
 * credentials are wrong, onboarding still completes: the FoodShare account
 * record keeps the selected role, and `requireRole` accepts that stored role.
 * The user simply needs an administrator (Member 1) to assign the realm role
 * before the SPA shows the matching workspace.
 */

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

const adminTokenUrl = `${env.keycloak.baseUrl}/realms/master/protocol/openid-connect/token`;
const adminApi = `${env.keycloak.baseUrl}/admin/realms/${env.keycloak.realm}`;

const getAdminToken = async (): Promise<string | null> => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value;
  }

  const response = await fetch(adminTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: env.keycloak.adminUser,
      password: env.keycloak.adminPassword,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    console.warn(`[keycloak] admin token request failed with ${response.status}`);
    return null;
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) return null;

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 60) * 1000,
  };
  return cachedToken.value;
};

/**
 * Grants a realm role to a Keycloak user. Returns true when the mapping was
 * created, false when the sync was skipped or failed. Never throws.
 */
export const assignRealmRole = async (keycloakUserId: string, roleName: string): Promise<boolean> => {
  if (!env.keycloak.adminSyncEnabled) {
    console.warn('[keycloak] role sync disabled (KEYCLOAK_ADMIN_SYNC=false)');
    return false;
  }

  try {
    const token = await getAdminToken();
    if (!token) return false;

    const authHeaders = { Authorization: `Bearer ${token}` };

    const roleResponse = await fetch(`${adminApi}/roles/${encodeURIComponent(roleName)}`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(5000),
    });
    if (!roleResponse.ok) {
      console.warn(`[keycloak] realm role "${roleName}" not found (${roleResponse.status})`);
      return false;
    }
    const role = (await roleResponse.json()) as { id: string; name: string };

    const mappingResponse = await fetch(
      `${adminApi}/users/${encodeURIComponent(keycloakUserId)}/role-mappings/realm`,
      {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ id: role.id, name: role.name }]),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!mappingResponse.ok) {
      console.warn(`[keycloak] role mapping failed with ${mappingResponse.status}`);
      return false;
    }

    console.log(`[keycloak] assigned realm role "${roleName}" to ${keycloakUserId}`);
    return true;
  } catch (error) {
    console.warn('[keycloak] role sync error:', error instanceof Error ? error.message : error);
    return false;
  }
};
