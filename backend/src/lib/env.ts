import dotenv from 'dotenv';

dotenv.config();

const bool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const int = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trimSlash = (value: string) => value.replace(/\/+$/, '');

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 3000),

  /** Public base URL of this API. Used to build absolute image URLs. */
  publicUrl: trimSlash(process.env.PUBLIC_API_URL ?? `http://localhost:${int(process.env.PORT, 3000)}`),

  /** Comma-separated list of browser origins allowed to call the API. */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://foodshare:foodshare_password@localhost:5432/foodshare_db?schema=public',

  keycloak: {
    baseUrl: trimSlash(process.env.KEYCLOAK_URL ?? 'http://localhost:8080'),
    realm: process.env.KEYCLOAK_REALM ?? 'foodshare',
    /**
     * Accepted `aud`/`azp` values. Keycloak puts the browser client id in `azp`,
     * and frequently emits `account` as the audience, so both are allowed.
     */
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'foodshare-web',
    /**
     * Server-side credentials used only to reflect a role selection back into
     * Keycloak after onboarding (ADR-005). Never exposed to the browser.
     * Member 1 replaces these with a dedicated service account.
     */
    adminSyncEnabled: bool(process.env.KEYCLOAK_ADMIN_SYNC, true),
    adminUser: process.env.KEYCLOAK_ADMIN_USER ?? 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin',
  },

  auth: {
    /**
     * Development escape hatch: accept unverified tokens so the API can be run
     * without Keycloak. Hard-disabled when NODE_ENV=production.
     */
    devBypass: bool(process.env.AUTH_DEV_BYPASS, false) && process.env.NODE_ENV !== 'production',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://user:password@localhost:5672',
    /** Queue consumed by Member 5's notification worker. */
    notificationQueue: process.env.NOTIFICATION_QUEUE ?? 'notification_queue',
    enabled: bool(process.env.RABBITMQ_ENABLED, true),
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxBytes: int(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
  },

  geocoding: {
    /** 'none' | 'nominatim' | 'google' */
    provider: (process.env.GEOCODING_PROVIDER ?? 'none').toLowerCase(),
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    timeoutMs: int(process.env.GEOCODING_TIMEOUT_MS, 4000),
  },

  policy: {
    /**
     * FR2 asks administrators to approve donors as well as recipients. The default
     * below matches the behaviour Member 2's UI was built against (recipients wait
     * for approval, donors and volunteers do not) so mock mode and integrated mode
     * behave identically. Member 1 can switch on the stricter FR2 reading.
     */
    requireDonorApproval: bool(process.env.REQUIRE_DONOR_APPROVAL, false),
  },
};

export const pageDefaults = {
  size: int(process.env.DEFAULT_PAGE_SIZE, 6),
  maxSize: int(process.env.MAX_PAGE_SIZE, 50),
};
