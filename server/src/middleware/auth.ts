import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import prisma from '../db.js';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  restaurantId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan. Token topilmadi.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: string; restaurantId?: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { memberships: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Foydalanuvchi topilmadi yoki hisob o‘chirilgan.' });
      return;
    }

    const primaryRestaurantId = user.memberships.find(membership => membership.restaurant_id === decoded.restaurantId)?.restaurant_id
      ?? user.memberships[0]?.restaurant_id;

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: primaryRestaurantId,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Yaroqsiz yoki muddati o‘tgan token.' });
  }
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Ushbu amalni bajarish uchun sizda ruxsat yo‘q.' });
      return;
    }

    next();
  };
};

export const requireTenantAccess = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
    return;
  }

  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const restaurantId = req.params.restaurantId || req.body.restaurant_id || req.query.restaurantId as string;
  if (!restaurantId) {
    return next();
  }

  const membership = await prisma.restaurantMembership.findFirst({
    where: {
      restaurant_id: restaurantId,
      user_id: req.user.id,
    },
  });

  if (!membership) {
    res.status(403).json({ error: 'Siz faqat o‘z restoraningiz ma’lumotlarini boshqarishingiz mumkin.' });
    return;
  }

  next();
};
