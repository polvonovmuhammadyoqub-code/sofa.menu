import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import type { Order, OrderItem, RestaurantTable } from '@prisma/client';
import config from '../config.js';
import prisma from '../db.js';
import { previewAllowed } from '../middleware/preview.js';
import { canManageOrders } from './guestOrders.js';

let io: SocketIOServer | null = null;

type OrderWithDetails = Order & { table: RestaurantTable | null; items: OrderItem[] };

export function publicTableOrder(order: OrderWithDetails) {
  return {
    id: order.id,
    order_number: order.order_number,
    restaurant_id: order.restaurant_id,
    status: order.status,
    total_amount: order.total_amount,
    payment_status: order.payment_status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: order.items.map(({ id, order_id, menu_item_id, dish_name, quantity, unit_price, total_price, status, created_at }) =>
      ({ id, order_id, menu_item_id, dish_name, quantity, unit_price, total_price, status, created_at })),
    table: order.table && { table_number: order.table.table_number },
  };
}

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    allowRequest: (req, callback) => callback(null, previewAllowed(req.headers.cookie)),
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    for (const audience of ['restaurant', 'kitchen', 'waiter']) {
      socket.on(`join:${audience}`, async (restaurantId: unknown) => {
        try {
          if (typeof restaurantId !== 'string' || typeof socket.handshake.auth.token !== 'string') return;
          const decoded = jwt.verify(socket.handshake.auth.token, config.jwtSecret);
          if (typeof decoded === 'string' || typeof decoded.id !== 'string') return;
          const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, role: true } });
          if (user && await canManageOrders(user.id, user.role, restaurantId)) {
            await socket.join(`${audience}_${restaurantId}`);
          }
        } catch {
          // Guests can connect for their own order tracking without joining staff rooms.
        }
      });
    }

    socket.on('join:order', (orderId: unknown) => {
      if (typeof orderId === 'string' && /^[0-9a-f-]{36}$/i.test(orderId)) {
        void socket.join(`order_${orderId}`);
      }
    });

    let lastWaiterCall = 0;
    socket.on('table:call_waiter', async (data: unknown, response: unknown) => {
      const acknowledge = (ok: boolean) => {
        if (typeof response === 'function') response({ ok });
      };
      if (!data || typeof data !== 'object' || !('restaurantId' in data) || !('tableNumber' in data) ||
          typeof data.restaurantId !== 'string' || typeof data.tableNumber !== 'string' ||
          data.restaurantId.length > 100 || data.tableNumber.length > 60 ||
          Date.now() - lastWaiterCall < 30_000) {
        acknowledge(false);
        return;
      }
      lastWaiterCall = Date.now();
      try {
        const table = await prisma.restaurantTable.findFirst({
          where: {
            restaurant_id: data.restaurantId,
            table_number: data.tableNumber,
            is_active: true,
            restaurant: { is_active: true, menu_ordering_enabled: true },
          },
          select: { table_number: true, restaurant_id: true },
        });
        const room = table && `restaurant_${table.restaurant_id}`;
        if (room && io?.sockets.adapter.rooms.get(room)?.size) {
          io.to(room).emit('waiter:notification', {
            title: `Ofitsiant chaqirildi — Stol №${table.table_number}`,
            message: 'Mijoz ofitsiantni kutmoqda',
            tableNumber: table.table_number,
            timestamp: new Date().toISOString(),
          });
          acknowledge(true);
          return;
        }
      } catch {
        // No notification was delivered.
      }
      acknowledge(false);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => io;

export const emitOrderCreated = (restaurantId: string, order: OrderWithDetails) => {
  io?.to(`restaurant_${restaurantId}`).emit('order:created', order);
  io?.to(`kitchen_${restaurantId}`).emit('kitchen:new_order', order);
  io?.to(`waiter_${restaurantId}`).emit('waiter:new_order', order);
};

export const emitOrderStatusChanged = (restaurantId: string, order: OrderWithDetails) => {
  io?.to(`restaurant_${restaurantId}`).emit('order:updated', order);
  io?.to(`kitchen_${restaurantId}`).emit('kitchen:order_updated', order);
  io?.to(`waiter_${restaurantId}`).emit('waiter:order_updated', order);
  if (order.delivery_fee === null) {
    io?.to(`order_${order.id}`).emit('order:status_update', publicTableOrder(order));
  }
};
