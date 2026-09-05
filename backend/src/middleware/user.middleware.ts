import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { notFound, unauthenticated } from '../lib/errors';
import type { AccountUser } from '../types/auth';

/**
 * Resolves the FoodShare account for the authenticated caller.
 *
 * The Keycloak subject is an identifier issued by the identity provider; the
 * FoodShare `User.id` is a separate database UUID. Looking a user up by `sub`
 * against `User.keycloakId` is the contract Member 2 documented in
 * frontend/README.md, and it is what the original scaffolding got wrong: it
 * passed the Keycloak `sub` straight into `donorProfile.findUnique({ userId })`,
 * which can never match.
 *
 * Absence of an account is not an error here. A user who has authenticated but
 * not completed onboarding simply has `req.dbUser === null`, which lets
 * GET /api/users/profile/me answer 404 and the UI redirect to onboarding.
 */
export const attachDbUser = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth) {
    next(unauthenticated());
    return;
  }

  let user = await prisma.user.findUnique({
    where: { keycloakId: req.auth.keycloakId },
    select: {
      id: true,
      keycloakId: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      verificationStatus: true,
    },
  });

  // Auto-provision an account for Keycloak Admins if one doesn't exist.
  // Admins do not go through the frontend onboarding flow.
  if (!user && req.auth.roles.includes('Admin')) {
    user = await prisma.user.create({
      data: {
        keycloakId: req.auth.keycloakId,
        name: req.auth.name,
        email: req.auth.email,
        phone: 'N/A',
        role: 'Admin',
        verificationStatus: 'Approved',
      },
      select: {
        id: true,
        keycloakId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        verificationStatus: true,
      },
    });
  }

  req.dbUser = (user as AccountUser | null) ?? null;
  next();
};

/** Guards routes that only make sense once onboarding has produced an account. */
export const requireAccount = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.dbUser) {
    next(notFound('Complete your profile to continue.'));
    return;
  }
  next();
};
