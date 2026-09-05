import { Request, Response } from 'express';
import { parsePageRequest } from '../../lib/pagination';
import { getUsers, getStats, verifyUser } from './admin.service';
import { verifyUserSchema } from './admin.schema';
import { ApprovalStatus } from '@prisma/client';

export const getAdminUsers = async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const pageRequest = parsePageRequest(req.query);
  
  const result = await getUsers(pageRequest, search, sort);
  res.json(result);
};

export const putVerifyUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { status } = verifyUserSchema.parse(req.body);
  
  const result = await verifyUser(String(userId), status as ApprovalStatus);
  res.json(result);
};

export const getAdminStats = async (req: Request, res: Response) => {
  const stats = await getStats();
  res.json(stats);
};
