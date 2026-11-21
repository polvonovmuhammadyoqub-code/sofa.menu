import express, { type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config.js';
import { previewGate } from './middleware/preview.js';

// Route imports
import authRoutes from './routes/auth.js';
import restaurantRoutes, { guestRouter as guestRestaurants } from './routes/restaurants.js';
import menuRoutes from './routes/menu.js';
import tableRoutes from './routes/tables.js';
import orderRoutes, { guestRouter as guestOrders } from './routes/orders.js';
import deliveryRoutes from './routes/delivery.js';
import importRoutes from './routes/import.js';
import analyticsRoutes, { guestRouter as guestAnalytics } from './routes/analytics.js';
import superAdminRoutes from './routes/superAdmin.js';
import uploadRoutes from './routes/upload.js';
import { publicRouter as publicReservations, staffRouter as staffReservations, telegramRouter } from './routes/reservations.js';

export const createApp = ({ guestOnly = false } = {}) => {
  const frontend = path.resolve(process.cwd(), guestOnly ? 'client/dist-guest' : 'client/dist');
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
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      platform: 'SOFA Restaurant Experience Platform',
      version: '1.0.0',
      ...(guestOnly && { build: 'guest-menu' }),
      ...(process.env.RENDER_GIT_COMMIT && { commit: process.env.RENDER_GIT_COMMIT }),
      timestamp: new Date().toISOString(),
    });
  });

  if (guestOnly) {
    app.use(/^\/(?:dashboard|login|kitchen|waiter|super-admin)(?=\/|$)/i, (_req, res) => res.sendStatus(404));
    // The stock footage and credits are public. The catalog and preview UI still require the preview cookie.
    app.use('/media/sofa-signature', express.static(path.join(frontend, 'media/sofa-signature'), { index: false, maxAge: '1d' }));
  } else {
    app.use('/api/integrations/telegram', telegramRouter);
  }
  app.use(previewGate);
  app.use('/uploads', express.static(config.uploadsDir, { index: false, redirect: false }));

  if (guestOnly) {
    app.use('/api/restaurants', guestRestaurants);
    app.use('/api/orders', guestOrders);
    app.use('/api/analytics', guestAnalytics);
  } else {
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
  }

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'So‘ralgan API yo‘li topilmadi' });
  });

  if (guestOnly) {
    app.get(['/', '/r/:slug'], (req, res) => {
      const slug = encodeURIComponent(req.params.slug || 'sofa-signature');
      const queryStart = req.originalUrl.indexOf('?');
      const query = queryStart < 0 ? '' : req.originalUrl.slice(queryStart);
      res.redirect(302, `/r/${slug}/menu${query}`);
    });
    app.use(express.static(frontend, { index: false, redirect: false }));
    app.get(['/r/:slug/menu', '/r/:slug/contact'], (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
    app.use((_req, res) => res.sendStatus(404));
  } else {
    app.use(express.static(frontend));
    app.get('*', (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
  }

  // Centralized Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, next: NextFunction) => {
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
