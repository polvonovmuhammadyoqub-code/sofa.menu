import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
export const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    jwtSecret: process.env.JWT_SECRET || 'sofa_luxury_restaurant_secret_key_2026_super_secure',
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    uploadsDir: path.resolve(process.cwd(), 'uploads'),
};
export default config;
