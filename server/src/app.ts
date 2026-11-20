import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config.js';

// Route imports
import authRoutes from './routes/auth.js';
import restaurantRoutes from './routes/restaurants.js';
import menuRoutes from './routes/menu.js';
import tableRoutes from './routes/tables.js';
import orderRoutes from './routes/orders.js';
import importRoutes from './routes/import.js';
import analyticsRoutes from './routes/analytics.js';
import superAdminRoutes from './routes/superAdmin.js';
import uploadRoutes from './routes/upload.js';

export const createApp = () => {
  const app = express();

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

  // Static uploads serving
  app.use('/uploads', express.static(config.uploadsDir));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      platform: 'SOFA Restaurant Experience Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/menu-import', importRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/uploads', uploadRoutes);

  // 404 Handler for API
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'So‘ralgan API yo‘li topilmadi' });
  });

  // Centralized Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Ichki server xatoligi yuz berdi',
    });
  });

  return app;
};

export default createApp;
