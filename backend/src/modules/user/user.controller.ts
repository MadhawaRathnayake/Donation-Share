import { Request, Response } from 'express';
import { unauthenticated } from '../../lib/errors';
import { createProfile, getMyProfile, updateMyProfile } from './user.service';
import { profileInputSchema } from './user.schema';

/**
 * Controllers stay thin: validate, delegate, respond. Express 5 forwards a
 * rejected promise to the error handler, so there are no try/catch blocks and
 * every failure is formatted in one place (lib/errors.ts).
 */

export const getProfileMe = async (req: Request, res: Response) => {
  // requireAccount has already rejected callers without an account row.
  res.json(await getMyProfile(req.dbUser!.id));
};

export const postProfile = async (req: Request, res: Response) => {
  if (!req.auth) throw unauthenticated();
  const input = profileInputSchema.parse(req.body);
  res.status(201).json(await createProfile(req.auth, input));
};

export const putProfileMe = async (req: Request, res: Response) => {
  const input = profileInputSchema.parse(req.body);
  res.json(await updateMyProfile(req.dbUser!.id, input));
};
