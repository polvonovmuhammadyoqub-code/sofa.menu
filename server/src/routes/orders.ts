import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { guestOrderRateLimit } from '../middleware/guestOrderRate.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { emitOrderCreated, emitOrderStatusChanged, publicTableOrder } from '../services/socket.js';
import { canManageOrders, createGuestOrder, GuestOrderError, orderItemsSchema } from '../services/guestOrders.js';

const router = Router();
export const guestRouter = Router();

const createOrderSchema = z.object({
  restaurant_id: z.string().min(1).max(100),
  table_number: z.string().trim().min(1).max(60),
  customer_name: z.string().trim().max(160).optional(),
  customer_phone: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(500).optional(),
  items: orderItemsSchema,
});

guestRouter.post('/', guestOrderRateLimit, async (req, res): Promise<void> => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Buyurtma ma’lumotlarini tekshiring' });
      return;
    }
    const { restaurant_id, table_number, customer_name, customer_phone, notes, items } = parsed.data;
    const { order } = await createGuestOrder({
      restaurantId: restaurant_id,
      tableNumber: table_number,
      customerName: customer_name,
      customerPhone: customer_phone,
      notes,
      items,
    });
    emitOrderCreated(restaurant_id, order);
    res.status(201).json({ order: publicTableOrder(order) });
  } catch (error) {
    if (error instanceof GuestOrderError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Buyurtma qabul qilishda xatolik yuz berdi' });
  }
});

guestRouter.get('/:id', async (req, res): Promise<void> => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, delivery_fee: null },
      include: {
        items: true,
        table: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Buyurtma topilmadi' });
      return;
    }

    res.set('Cache-Control', 'no-store').json(publicTableOrder(order));
  } catch {
    res.status(500).json({ error: 'Buyurtma ma’lumotlarini yuklashda xatolik' });
  }
});

router.use(guestRouter);

router.get('/restaurants/:restaurantId/list', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    if (!await canManageOrders(req.user!.id, req.user!.role, restaurantId)) {
      res.status(403).json({ error: 'Ruxsat yo‘q' });
      return;
    }

    const { status, table_id, limit } = req.query;
    const take = Number(limit ?? 50);
    if (!Number.isInteger(take) || take < 1 || take > 100) {
      res.status(400).json({ error: 'Buyurtmalar soni noto‘g‘ri' });
      return;
    }
    const orders = await prisma.order.findMany({
      where: {
        restaurant_id: restaurantId,
        ...(status && { status: String(status) }),
        ...(table_id && { table_id: String(table_id) }),
      },
      orderBy: { created_at: 'desc' },
      take,
      include: {
        items: true,
        table: true,
        status_history: { orderBy: { created_at: 'asc' } },
      },
    });

    res.set('Cache-Control', 'no-store').json(orders);
  } catch {
    res.status(500).json({ error: 'Buyurtmalar ro‘yxatini yuklashda xatolik' });
  }
});

const transitionSchema = z.object({
  status: z.enum(['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor', 'Yo‘lda', 'Yetkazildi', 'Bekor qilindi']),
  notes: z.string().trim().max(500).optional(),
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Noto‘g‘ri buyurtma holati' });
      return;
    }
    const { status, notes } = parsed.data;

    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder || !await canManageOrders(req.user!.id, req.user!.role, currentOrder.restaurant_id)) {
      res.status(404).json({ error: 'Buyurtma topilmadi' });
      return;
    }
    if (status === 'Yo‘lda' && currentOrder.delivery_fee === null) {
      res.status(400).json({ error: 'Ushbu buyurtma yetkazib berilmaydi' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status },
        include: { items: true, table: true },
      });

      if (currentOrder.status !== status) {
        await tx.orderStatusHistory.create({
          data: {
            order_id: id,
            status,
            changed_by: req.user!.email,
            notes: notes || `Holat o‘zgartirildi: ${status}`,
          },
        });
      }

      return order;
    });

    emitOrderStatusChanged(currentOrder.restaurant_id, updated);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Holatni yangilashda xatolik' });
  }
});

export default router;
