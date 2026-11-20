import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth.js';

const router = Router();

// Require SUPER_ADMIN role for all endpoints in this router
router.use(authenticate);
router.use(requireRoles(['SUPER_ADMIN']));

// 1. Platform analytics
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalRestaurants = await prisma.restaurant.count();
    const totalOrders = await prisma.order.count();
    const totalDishes = await prisma.menuItem.count();
    const totalUsers = await prisma.user.count();

    const orders = await prisma.order.findMany({
      where: { status: { not: 'Bekor qilindi' } },
      select: { total_amount: true },
    });
    const platformRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);

    const subscriptionPlans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    res.json({
      totalRestaurants,
      totalOrders,
      totalDishes,
      totalUsers,
      platformRevenue,
      subscriptionPlans,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Super-admin statistikasini olishda xatolik' });
  }
});

// 2. All restaurants list
router.get('/restaurants', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            menu_items: true,
            tables: true,
            orders: true,
          },
        },
        subscriptions: {
          include: { plan: true },
          take: 1,
          orderBy: { started_at: 'desc' },
        },
      },
    });

    res.json(restaurants);
  } catch (err: any) {
    res.status(500).json({ error: 'Restoranlar ro‘yxatini olishda xatolik' });
  }
});

// 3. Create restaurant from super-admin
router.post('/restaurants', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, phone, address, plan_code } = req.body;
    if (!name || !slug) {
      res.status(400).json({ error: 'Restoran nomi va slug kiritilishi shart' });
      return;
    }

    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (existing) {
      res.status(400).json({ error: 'Ushbu slug bilan restoran allaqachon mavjud' });
      return;
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        phone,
        address,
        tagline: 'Premium Dining Experience',
      },
    });

    if (plan_code) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { code: plan_code } });
      if (plan) {
        await prisma.subscription.create({
          data: {
            restaurant_id: restaurant.id,
            plan_id: plan.id,
            status: 'ACTIVE',
          },
        });
      }
    }

    res.status(201).json(restaurant);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Restoran yaratishda xatolik' });
  }
});

// 4. Toggle restaurant active status
router.patch('/restaurants/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updated = await prisma.restaurant.update({
      where: { id },
      data: { is_active: Boolean(is_active) },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Restoran holatini o‘zgartirishda xatolik' });
  }
});

export default router;
