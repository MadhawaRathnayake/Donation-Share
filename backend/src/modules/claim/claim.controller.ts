import { Request, Response } from 'express';
import { parsePageRequest } from '../../lib/pagination';
import { createClaimSchema } from './claim.schema';
import { createClaim, listMyClaims } from './claim.service';

export const postClaim = async (req: Request, res: Response) => {
  const { donationId } = createClaimSchema.parse(req.body);
  const claim = await createClaim(req.dbUser!.id, donationId);
  res.status(201).json(claim);
};

export const getMyClaims = async (req: Request, res: Response) => {
  const page = parsePageRequest(req.query);
  const claims = await listMyClaims(req.dbUser!.id, page);
  res.json(claims);
};
