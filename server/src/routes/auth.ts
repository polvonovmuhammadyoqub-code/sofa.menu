import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../db.js';
import config from '../config.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Noto‘g‘ri email formati'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lishi kerak'),
  full_name: z.string().min(2, 'Ism-familiya kiritilishi shart'),
  phone: z.string().optional(),
  restaurant_name: z.string().min(2, 'Restoran nomi kiritilishi shart').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Noto‘g‘ri email formati'),
  password: z.string().min(1, 'Parol kiritilishi shart'),
});

router.post('/register', async (req: any, res: any): Promise<void> => {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { email, password, full_name, phone, restaurant_name } = parse.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Ushbu email bilan foydalanuvchi allaqachon mavjud.' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        full_name,
        phone,
        role: 'RESTAURANT_OWNER',
      },
    });

    let restaurantId: string | undefined;

    if (restaurant_name) {
      const slug = restaurant_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);

      const restaurant = await prisma.restaurant.create({
        data: {
          name: restaurant_name,
          slug,
          tagline: 'Premium Dining Experience',
          description: 'SOFA platformasidagi zamonaviy raqamli restoran.',
          currency: 'UZS',
        },
      });

      restaurantId = restaurant.id;

      await prisma.restaurantMembership.create({
        data: {
          restaurant_id: restaurant.id,
          user_id: user.id,
          role: 'RESTAURANT_OWNER',
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, restaurantId },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Muvaffaqiyatli ro‘yxatdan o‘tildi',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        restaurantId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi' });
  }
});

router.post('/login', async (req: any, res: any): Promise<void> => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0].message });
      return;
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { restaurant: true },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Email yoki parol noto‘g‘ri' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Email yoki parol noto‘g‘ri' });
      return;
    }

    const primaryMembership = user.memberships[0];
    const restaurantId = primaryMembership?.restaurant_id;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, restaurantId },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Muvaffaqiyatli tizimga kirildi',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        restaurantId,
        restaurant: primaryMembership?.restaurant,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Tizimga kirishda xatolik yuz berdi' });
  }
});

router.get('/me', authenticate, async (req: any, res: any): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        memberships: {
          include: { restaurant: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
      memberships: user.memberships,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Foydalanuvchi ma’lumotlarini olishda xatolik' });
  }
});

export default router;
