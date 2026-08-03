import type { Role } from '@prisma/client';

/** The caller's Keycloak identity, taken from the verified access token. */
export interface AuthenticatedUser {
  /** Keycloak `sub`. Matches User.keycloakId, NOT User.id. */
  keycloakId: string;
  username: string;
  email: string;
  name: string;
  roles: string[];
}

/** The FoodShare account record resolved from the Keycloak subject. */
export interface AccountUser {
  id: string;
  keycloakId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  verificationStatus: 'Pending' | 'Approved' | 'Rejected';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `authenticate`. */
      auth?: AuthenticatedUser;
      /** Set by `attachDbUser`. Null when the caller has not onboarded yet. */
      dbUser?: AccountUser | null;
    }
  }
}

export {};
