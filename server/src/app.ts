import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config.js';
import { previewGate } from './middleware/preview.js';

// Route imports
import authRoutes from './routes/auth.js';
import restaurantRoutes from './routes/restaurants.js';
import menuRoutes from './routes/menu.js';
import tableRoutes from './routes/tables.js';
import orderRoutes from './routes/orders.js';
import deliveryRoutes from './routes/delivery.js';
import importRoutes from './routes/import.js';
import analyticsRoutes from './routes/analytics.js';
import superAdminRoutes from './routes/superAdmin.js';
import uploadRoutes from './routes/upload.js';
import { publicRouter as publicReservations, staffRouter as staffReservations, telegramRouter } from './routes/reservations.js';

export const createApp = () => {
  const app = express();
  if (process.env.RENDER === 'true') app.set('trust proxy', 1);

  // Basic security and parsing
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: '*',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      platform: 'SOFA Restaurant Experience Platform',
      version: '1.0.0',
      ...(process.env.RENDER_GIT_COMMIT && { commit: process.env.RENDER_GIT_COMMIT }),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/integrations/telegram', telegramRouter);
  app.use(previewGate);
  app.use('/uploads', express.static(config.uploadsDir));

  // REST API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/restaurants', publicReservations);
  app.use('/api/admin/restaurants', staffReservations);
  app.use('/api/menu', menuRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/restaurants', deliveryRoutes);
  app.use('/api/menu-import', importRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/uploads', uploadRoutes);

  // 404 Handler for API
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'So‘ralgan API yo‘li topilmadi' });
  });

  const frontend = path.resolve(process.cwd(), 'client/dist');
  app.use(express.static(frontend));
  app.get('*', (req, res) => res.sendFile(path.join(frontend, 'index.html')));

  // Centralized Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error('Unhandled server error', { status });
    const message = status === 413 ? 'So‘rov hajmi chegaradan oshdi'
      : status < 500 ? 'So‘rovni tekshirib, qayta yuboring'
      : 'Ichki server xatoligi yuz berdi';
    res.status(status).json({ error: message });
  });

  return app;
};

export default createApp;
