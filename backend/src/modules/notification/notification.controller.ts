import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const keycloakId = (req as any).user.id;
    
    const user = await prisma.user.findUnique({
      where: { keycloakId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in local DB' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { sentAt: 'desc' },
      take: 20
    });

    return res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const keycloakId = (req as any).user.id;
    const notificationId = req.params.id as string;
    
    const user = await prisma.user.findUnique({
      where: { keycloakId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in local DB' });
    }

    const notification = await prisma.notification.updateMany({
      where: { 
        id: notificationId,
        userId: user.id // ensure they own it
      },
      data: { readStatus: true }
    });

    return res.json({ notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
