import { NextFunction, Request, Response } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../lib/env';
import { forbidden, unauthenticated } from '../lib/errors';
import type { AuthenticatedUser } from '../types/auth';

/**
 * Keycloak-backed authentication (ADR-005).
 *
 * The API never issues tokens. The browser authenticates directly against
 * Keycloak, and this middleware verifies the resulting bearer token's RS256
 * signature against the realm's published JWKS. The previous scaffolding used
 * `jwt.decode`, which parses a token without checking the signature and would
 * accept a token any caller had hand-written.
 */

const issuer = `${env.keycloak.baseUrl}/realms/${env.keycloak.realm}`;
const jwksUri = `${issuer}/protocol/openid-connect/certs`;

const keys = jwksClient({
  jwksUri,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  timeout: 5000,
});

const getSigningKey = (header: JwtHeader, callback: SigningKeyCallback) => {
  if (!header.kid) {
    callback(new Error('Token header has no key id'));
    return;
  }
  keys.getSigningKey(header.kid, (error, key) => {
    if (error || !key) {
      callback(error ?? new Error('Signing key not found'));
      return;
    }
    callback(null, key.getPublicKey());
  });
};

const verifyToken = (token: string): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      { algorithms: ['RS256'], issuer },
      (error, decoded) => {
        if (error || !decoded || typeof decoded === 'string') {
          reject(error ?? new Error('Token could not be verified'));
          return;
        }
        resolve(decoded as Record<string, unknown>);
      },
    );
  });

/** Merges realm roles and this client's roles into one list. */
const extractRoles = (claims: Record<string, unknown>): string[] => {
  const realmAccess = claims.realm_access as { roles?: string[] } | undefined;
  const resourceAccess = claims.resource_access as Record<string, { roles?: string[] }> | undefined;
  return [
    ...(realmAccess?.roles ?? []),
    ...(resourceAccess?.[env.keycloak.clientId]?.roles ?? []),
  ];
};

export const toAuthenticatedUser = (claims: Record<string, unknown>): AuthenticatedUser => ({
  keycloakId: String(claims.sub ?? ''),
  username: String(claims.preferred_username ?? ''),
  email: String(claims.email ?? ''),
  name: String(claims.name ?? claims.preferred_username ?? 'FoodShare user'),
  roles: extractRoles(claims),
});

/**
 * Requires a valid bearer token and attaches the caller's Keycloak identity to
 * `req.auth`. `req.auth.keycloakId` is the Keycloak `sub`; it is deliberately
 * NOT treated as a FoodShare database id (see attachDbUser).
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(unauthenticated('Missing or malformed Authorization header.'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    let claims: Record<string, unknown>;

    if (env.auth.devBypass) {
      // Local development without Keycloak. Never active when NODE_ENV=production.
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string') throw new Error('Token could not be decoded');
      claims = decoded as Record<string, unknown>;
    } else {
      claims = await verifyToken(token);
    }

    const user = toAuthenticatedUser(claims);
    if (!user.keycloakId) throw new Error('Token has no subject claim');

    req.auth = user;
    next();
  } catch (error) {
    next(unauthenticated(error instanceof Error ? error.message : 'Token verification failed.'));
  }
};

/**
 * Role check. A role counts if Keycloak granted it OR if the caller already
 * holds it on their FoodShare account record.
 *
 * Both sources matter: Keycloak is the authority once Member 1's role sync has
 * run, but a user who has just completed onboarding may still be holding an
 * access token issued before the role was assigned. Accepting the stored role
 * keeps onboarding usable without weakening authentication, because the account
 * record itself is only reachable through a verified token.
 */
export const requireRole = (...allowed: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const tokenRoles = req.auth?.roles ?? [];
    const accountRole = req.dbUser?.role;
    const granted = tokenRoles.some((role) => allowed.includes(role))
      || (accountRole !== undefined && allowed.includes(accountRole));

    if (!granted) {
      next(forbidden(`This action requires the ${allowed.join(' or ')} role.`));
      return;
    }
    next();
  };
};
