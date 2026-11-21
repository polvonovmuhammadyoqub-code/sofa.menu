import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db.js';
import { guestOrderRateLimit } from '../middleware/guestOrderRate.js';
import { createGuestOrder, deliveryTracking, GuestOrderError, orderItemsSchema } from '../services/guestOrders.js';
import { emitOrderCreated } from '../services/socket.js';
import { sendTelegramMessage, telegramDestination } from '../services/telegram.js';

const router = Router();
const deliverySchema = z.object({
  request_id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(32).transform(value => value.replace(/[\s().-]/g, ''))
    .pipe(z.string().regex(/^\+?[0-9]{9,15}$/)),
  address: z.string().trim().min(5).max(240),
  apartment: z.string().trim().max(120).optional(),
  instructions: z.string().trim().max(400).optional(),
  payment: z.enum(['cash', 'card']),
  items: orderItemsSchema,
});

router.post('/:restaurantId/delivery-orders', guestOrderRateLimit, async (req, res) => {
  const parsed = deliverySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: 'INVALID_INPUT', error: 'Buyurtma ma’lumotlarini tekshiring' });
    return;
  }

  const restaurantId = req.params.restaurantId;
  const { request_id, first_name, last_name, phone, address, apartment, instructions, payment, items } = parsed.data;
  const customerName = `${first_name} ${last_name}`;
  const deliveryAddress = apartment ? `${address}, ${apartment}` : address;
  const notes = [
    `Yetkazib berish · ${deliveryAddress}`,
    `To‘lov · ${payment === 'cash' ? 'Naqd' : 'Karta'}`,
    instructions,
  ].filter(Boolean).join('\n');

  try {
    const { order, created } = await createGuestOrder({
      restaurantId,
      items,
      customerName,
      customerPhone: phone,
      notes,
      delivery: { requestId: request_id, payment },
    });

    if (created) {
      emitOrderCreated(restaurantId, order);
      void notifyDelivery(restaurantId, order.id, order.order_number, customerName, phone, notes, order.total_amount);
    }
    res.set('Cache-Control', 'no-store').status(created ? 201 : 200).json(deliveryTracking(order));
  } catch (error) {
    if (error instanceof GuestOrderError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ code: 'ORDER_FAILED', error: 'Buyurtmani yuborib bo‘lmadi' });
  }
});

async function notifyDelivery(restaurantId: string, orderId: string, number: number, name: string, phone: string, notes: string, total: number) {
  let status = 'FAILED';
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }, select: { slug: true, name: true },
    });
    const destination = restaurant && telegramDestination(restaurant.slug);
    if (destination) {
      await sendTelegramMessage(destination, [
        `🚚 SOFA — YETKAZIB BERISH #${number}`,
        restaurant.name,
        name,
        phone,
        notes,
        `Jami · ${total.toLocaleString('uz-UZ')} UZS`,
      ].join('\n'));
      status = 'SENT';
    } else {
      status = 'NOT_CONFIGURED';
    }
  } catch {
    // The order has already been saved and can be processed by staff.
  }
  await prisma.order.update({ where: { id: orderId }, data: { delivery_notification_status: status } }).catch(() => {});
}

router.get('/:restaurantId/delivery-orders/:id', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, restaurant_id: req.params.restaurantId, delivery_fee: { not: null } },
      select: { id: true, order_number: true, status: true, total_amount: true, delivery_fee: true },
    });

    if (!order) {
      res.status(404).json({ code: 'ORDER_NOT_FOUND', error: 'Buyurtma topilmadi' });
      return;
    }
    res.set('Cache-Control', 'no-store').json(deliveryTracking(order));
  } catch {
    res.status(500).json({ code: 'TRACKING_FAILED', error: 'Buyurtmani yuklab bo‘lmadi' });
  }
});

export default router;
