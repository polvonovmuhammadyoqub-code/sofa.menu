import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../db.js';

export const orderItemsSchema = z.array(z.object({
  menu_item_id: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(20),
  selected_options: z.array(z.string().min(1).max(160)).max(20).optional(),
  notes: z.string().trim().max(240).optional(),
})).min(1).max(40);

export class GuestOrderError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type OrderInput = {
  restaurantId: string;
  items: z.infer<typeof orderItemsSchema>;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
} & ({ tableNumber: string; delivery?: never } | {
  tableNumber?: never;
  delivery: { requestId: string; payment: 'cash' | 'card' };
});

const withDetails = { items: true, table: true } as const;

export async function createGuestOrder(input: OrderInput) {
  const { restaurantId, tableNumber, delivery, items } = input;
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (delivery) {
          const saved = await tx.order.findFirst({
            where: { restaurant_id: restaurantId, delivery_request_id: delivery.requestId },
            include: withDetails,
          });
          if (saved) return { order: saved, created: false };
        }

        const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId } });
        if (!restaurant?.is_active) {
          throw new GuestOrderError(404, 'RESTAURANT_NOT_FOUND', 'Restoran topilmadi');
        }
        if (delivery ? !restaurant.delivery_enabled : !restaurant.menu_ordering_enabled) {
          throw new GuestOrderError(403, 'ORDERING_DISABLED', 'Restoran hozir buyurtma qabul qilmayapti');
        }
        if (delivery?.payment === 'card' && !restaurant.delivery_card_enabled) {
          throw new GuestOrderError(400, 'PAYMENT_UNAVAILABLE', 'To‘lov usuli mavjud emas');
        }
        const table = tableNumber ? await tx.restaurantTable.findFirst({
          where: { restaurant_id: restaurantId, table_number: tableNumber, is_active: true },
          select: { id: true },
        }) : null;
        if (!delivery && !table) {
          throw new GuestOrderError(400, 'TABLE_NOT_FOUND', 'Faol stol topilmadi');
        }

        const menu = await tx.menuItem.findMany({
          where: {
            id: { in: items.map(item => item.menu_item_id) },
            restaurant_id: restaurantId,
            is_available: true,
            category: { is_active: true, restaurant_id: restaurantId },
          },
          include: { options: true },
        });
        const menuById = new Map(menu.map(item => [item.id, item]));
        const lines = items.map(item => {
          const dish = menuById.get(item.menu_item_id);
          if (!dish) throw new GuestOrderError(400, 'ITEM_UNAVAILABLE', 'Tanlangan taomlardan biri mavjud emas');

          const optionNames = [...new Set(item.selected_options)];
          const choices = dish.options.filter(option => optionNames.includes(option.name));
          if (choices.length !== optionNames.length ||
              dish.options.some(option => option.is_required && !optionNames.includes(option.name))) {
            throw new GuestOrderError(400, 'OPTIONS_INVALID', 'Taom variantlarini tekshiring');
          }
          const unitPrice = dish.price + choices.reduce((price, option) => price + option.price_modifier, 0);
          if (unitPrice < 0) throw new GuestOrderError(400, 'ITEM_UNAVAILABLE', 'Tanlangan taom narxi mavjud emas');
          return {
            menu_item_id: dish.id,
            dish_name: dish.name,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: unitPrice * item.quantity,
            selected_options: optionNames.length ? JSON.stringify(optionNames) : undefined,
            notes: item.notes,
          };
        });

        const deliveryFee = delivery ? restaurant.delivery_fee : 0;
        const total = lines.reduce((sum, line) => sum + line.total_price, deliveryFee);
        if (total > 2147483647) throw new GuestOrderError(400, 'ORDER_LIMIT', 'Buyurtma qiymati chegaradan oshdi');
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const count = await tx.order.count({
          where: { restaurant_id: restaurantId, created_at: { gte: dayStart } },
        });
        const order = await tx.order.create({
          data: {
            restaurant_id: restaurantId,
            table_id: table?.id,
            order_number: 101 + count,
            customer_name: input.customerName || 'Mehmon',
            customer_phone: input.customerPhone,
            total_amount: total,
            notes: input.notes,
            ...(delivery && {
              delivery_request_id: delivery.requestId,
              delivery_fee: deliveryFee,
              delivery_notification_status: 'PENDING',
            }),
            items: { create: lines },
            status_history: { create: { status: 'Yangi', changed_by: 'CUSTOMER' } },
          },
          include: withDetails,
        });
        return { order, created: true };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || (delivery && error.code === 'P2002'));
      if (!retryable || attempt >= 2) throw error;
    }
  }
}

const deliveryStatuses: Record<string, string> = {
  Yangi: 'PENDING',
  'Qabul qilindi': 'ACCEPTED',
  Tayyorlanmoqda: 'PREPARING',
  Tayyor: 'READY',
  'Yo‘lda': 'OUT_FOR_DELIVERY',
  Yetkazildi: 'DELIVERED',
  'Bekor qilindi': 'CANCELLED',
};

export function deliveryTracking(order: {
  id: string;
  order_number: number;
  status: string;
  total_amount: number;
  delivery_fee: number | null;
}) {
  return {
    id: order.id,
    order_number: order.order_number,
    status: deliveryStatuses[order.status] || 'PENDING',
    total_amount: order.total_amount,
    delivery_fee: order.delivery_fee,
  };
}

export async function canManageOrders(userId: string, role: string, restaurantId: string) {
  if (role === 'SUPER_ADMIN') return true;
  return Boolean(await prisma.restaurantMembership.findUnique({
    where: { restaurant_id_user_id: { restaurant_id: restaurantId, user_id: userId } },
    select: { id: true },
  }));
}
