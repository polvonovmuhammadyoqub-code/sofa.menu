import { Router, Response } from 'express';
import { z } from 'zod';
import { guestMenuEventRateLimit } from '../middleware/guestOrderRate.js';
import { restaurantClock } from '../services/reservationHours.js';
import prisma from '../db.js';
import { authenticate, AuthRequest, requireTenantAccess } from '../middleware/auth.js';

const router = Router();
export const guestRouter = Router();
const menuEvent = z.object({ itemId: z.string().min(1).max(64).optional() }).strict();

guestRouter.post('/restaurants/:restaurantId/menu-event', guestMenuEventRateLimit, async (req, res) => {
  const parsed = menuEvent.safeParse(req.body);
  if (!parsed.success) {
    res.sendStatus(400);
    return;
  }
  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: req.params.restaurantId, is_active: true },
      select: { id: true, reservation_timezone: true },
    });
    if (!restaurant) {
      res.sendStatus(404);
      return;
    }
    const { itemId } = parsed.data;
    if (itemId && !await prisma.menuItem.count({
      where: { id: itemId, restaurant_id: restaurant.id, category: { is_active: true } },
    })) {
      res.sendStatus(404);
      return;
    }
    const { date } = restaurantClock(restaurant.reservation_timezone);
    const key = { restaurant_id: restaurant.id, day: date, item_key: itemId ?? '' };
    await prisma.menuMetric.upsert({
      where: { restaurant_id_day_item_key: key },
      create: { ...key, count: 1 },
      update: { count: { increment: 1 } },
    });
    res.sendStatus(204);
  } catch {
    res.sendStatus(503);
  }
});

router.use(guestRouter);

router.get('/restaurants/:restaurantId/stats', authenticate, requireTenantAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 1. All time and today orders
    const todayOrders = await prisma.order.findMany({
      where: {
        restaurant_id: restaurantId,
        created_at: { gte: startOfDay },
        status: { not: 'Bekor qilindi' },
      },
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const todayOrdersCount = todayOrders.length;
    const averageOrderValue = todayOrdersCount > 0 ? Math.round(todayRevenue / todayOrdersCount) : 0;

    // 2. Active orders count
    const activeOrdersCount = await prisma.order.count({
      where: {
        restaurant_id: restaurantId,
        status: { in: ['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor'] },
      },
    });

    // 3. 7-Day revenue data
    const lastSevenDaysOrders = await prisma.order.findMany({
      where: {
        restaurant_id: restaurantId,
        created_at: { gte: sevenDaysAgo },
        status: { not: 'Bekor qilindi' },
      },
      select: {
        total_amount: true,
        created_at: true,
      },
    });

    const dayMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('uz-UZ', { weekday: 'short', month: 'numeric', day: 'numeric' });
      dayMap.set(key, 0);
    }

    for (const ord of lastSevenDaysOrders) {
      const key = new Date(ord.created_at).toLocaleDateString('uz-UZ', { weekday: 'short', month: 'numeric', day: 'numeric' });
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) || 0) + ord.total_amount);
      }
    }

    const revenueChart = Array.from(dayMap.entries()).map(([day, revenue]) => ({
      day,
      revenue,
    }));

    // 4. Popular dishes
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          restaurant_id: restaurantId,
          status: { not: 'Bekor qilindi' },
        },
      },
      select: {
        dish_name: true,
        quantity: true,
        total_price: true,
      },
    });

    const dishCounts = new Map<string, { count: number; totalRevenue: number }>();
    for (const item of orderItems) {
      const existing = dishCounts.get(item.dish_name) || { count: 0, totalRevenue: 0 };
      dishCounts.set(item.dish_name, {
        count: existing.count + item.quantity,
        totalRevenue: existing.totalRevenue + item.total_price,
      });
    }

    const popularDishes = Array.from(dishCounts.entries())
      .map(([name, data]) => ({
        name,
        orders: data.count,
        revenue: data.totalRevenue,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // 5. Total counts
    const totalDishes = await prisma.menuItem.count({ where: { restaurant_id: restaurantId } });
    const totalTables = await prisma.restaurantTable.count({ where: { restaurant_id: restaurantId } });

    const menuMetrics = await prisma.menuMetric.groupBy({
      by: ['item_key'],
      where: { restaurant_id: restaurantId, item_key: { not: '' }, day: { gte: sevenDaysAgo.toISOString().slice(0, 10) } },
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
      take: 10,
    });
    const viewTotal = await prisma.menuMetric.aggregate({
      where: { restaurant_id: restaurantId, item_key: '', day: { gte: sevenDaysAgo.toISOString().slice(0, 10) } },
      _sum: { count: true },
    });

    res.json({
      menuViews: viewTotal._sum.count ?? 0,
      mostViewedDishes: menuMetrics.map(metric => ({
        itemId: metric.item_key,
        views: metric._sum.count,
      })),
      todayRevenue,
      todayOrdersCount,
      activeOrdersCount,
      averageOrderValue,
      totalDishes,
      totalTables,
      revenueChart,
      popularDishes,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Statistikalarni yuklashda xatolik' });
  }
});

export default router;
