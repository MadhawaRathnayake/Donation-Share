import http from 'node:http';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

/**
 * Proves the authentication middleware really verifies signatures.
 *
 * A stand-in for Keycloak is started on a random port and serves a JWKS
 * document containing one public key. The middleware is then imported with
 * KEYCLOAK_URL pointing at it, so the whole path runs for real: fetch the
 * JWKS, match the token's `kid`, verify the RS256 signature, check the issuer.
 *
 * The test that matters most is the last one. The scaffolded middleware used
 * `jwt.decode`, which would have accepted a token signed with any key at all.
 */

const realm = 'foodshare';
const kid = 'test-signing-key';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const attacker = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const attackerPem = attacker.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

let server: http.Server;
let issuer: string;
let authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;

const claims = (extra: Record<string, unknown> = {}) => ({
  sub: '11111111-1111-1111-1111-111111111111',
  preferred_username: 'harbour_kitchen',
  email: 'donor@foodshare.test',
  name: 'Harbour Kitchen',
  realm_access: { roles: ['Donor'] },
  ...extra,
});

/** Runs the middleware and resolves with whatever it passed to `next`. */
const run = async (token?: string) => {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} } as unknown as Request;
  let error: unknown = null;
  await authenticate(req, {} as Response, ((passed?: unknown) => {
    error = passed ?? null;
  }) as NextFunction);
  return { req, error: error as Error | null };
};

beforeAll(async () => {
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, string>;

  server = http.createServer((request, response) => {
    if (request.url === `/realms/${realm}/protocol/openid-connect/certs`) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] }));
      return;
    }
    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  // Must be set before the middleware module reads its configuration.
  process.env.KEYCLOAK_URL = `http://127.0.0.1:${port}`;
  process.env.KEYCLOAK_REALM = realm;
  process.env.AUTH_DEV_BYPASS = 'false';
  issuer = `http://127.0.0.1:${port}/realms/${realm}`;

  ({ authenticate } = await import('../middleware/auth.middleware'));
});

afterAll(() => {
  server.close();
});

describe('authenticate', () => {
  it('rejects a request with no Authorization header', async () => {
    const { error } = await run();
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('accepts a token signed by the realm key and attaches the identity', async () => {
    const token = jwt.sign(claims(), privatePem, { algorithm: 'RS256', keyid: kid, issuer, expiresIn: '5m' });
    const { req, error } = await run(token);

    expect(error).toBeNull();
    expect(req.auth).toMatchObject({
      keycloakId: '11111111-1111-1111-1111-111111111111',
      username: 'harbour_kitchen',
      roles: ['Donor'],
    });
  });

  it('rejects a token signed with a key the realm does not publish', async () => {
    const forged = jwt.sign(
      claims({ realm_access: { roles: ['Admin'] } }),
      attackerPem,
      { algorithm: 'RS256', keyid: kid, issuer, expiresIn: '5m' },
    );
    const { req, error } = await run(forged);

    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(req.auth).toBeUndefined();
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign(claims(), privatePem, { algorithm: 'RS256', keyid: kid, issuer, expiresIn: '-1m' });
    const { error } = await run(expired);
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rejects a token issued by a different realm', async () => {
    const wrongIssuer = jwt.sign(claims(), privatePem, {
      algorithm: 'RS256',
      keyid: kid,
      issuer: 'https://evil.example.com/realms/foodshare',
      expiresIn: '5m',
    });
    const { error } = await run(wrongIssuer);
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rejects an unsigned "alg: none" token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT', kid })).toString('base64url');
    const body = Buffer.from(JSON.stringify(claims())).toString('base64url');
    const { error } = await run(`${header}.${body}.`);
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('merges realm roles and client roles into one list', async () => {
    const token = jwt.sign(
      claims({ resource_access: { 'foodshare-web': { roles: ['Volunteer'] } } }),
      privatePem,
      { algorithm: 'RS256', keyid: kid, issuer, expiresIn: '5m' },
    );
    const { req } = await run(token);
    expect(req.auth?.roles).toEqual(expect.arrayContaining(['Donor', 'Volunteer']));
  });
});
