import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join:restaurant', (restaurantId: string) => {
      socket.join(`restaurant_${restaurantId}`);
    });

    socket.on('join:kitchen', (restaurantId: string) => {
      socket.join(`kitchen_${restaurantId}`);
    });

    socket.on('join:waiter', (restaurantId: string) => {
      socket.join(`waiter_${restaurantId}`);
    });

    socket.on('join:order', (orderId: string) => {
      socket.join(`order_${orderId}`);
    });

    socket.on('table:call_waiter', (data: { restaurantId: string; tableNumber: string; requestType: string }) => {
      if (io) {
        io.to(`restaurant_${data.restaurantId}`).emit('waiter:notification', {
          title: `Ofitsiant chaqirildi — Stol №${data.tableNumber}`,
          message: data.requestType || 'Mijoz ofitsiantni kutmoqda',
          tableNumber: data.tableNumber,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

export const emitOrderCreated = (restaurantId: string, order: any) => {
  if (io) {
    io.to(`restaurant_${restaurantId}`).emit('order:created', order);
    io.to(`kitchen_${restaurantId}`).emit('kitchen:new_order', order);
    io.to(`waiter_${restaurantId}`).emit('waiter:new_order', order);
  }
};

export const emitOrderStatusChanged = (restaurantId: string, order: any) => {
  if (io) {
    io.to(`restaurant_${restaurantId}`).emit('order:updated', order);
    io.to(`kitchen_${restaurantId}`).emit('kitchen:order_updated', order);
    io.to(`waiter_${restaurantId}`).emit('waiter:order_updated', order);
    io.to(`order_${order.id}`).emit('order:status_update', order);
  }
};
