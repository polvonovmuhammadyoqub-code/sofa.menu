import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.PREVIEW_PASSWORD || process.env.PREVIEW_PASSWORD.length < 24)) {
  throw new Error('Production preview requires a strong JWT_SECRET and PREVIEW_PASSWORD (at least 24 characters).');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'sofa_luxury_restaurant_secret_key_2026_super_secure',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadsDir: path.resolve(process.cwd(), 'uploads'),
};

export default config;
