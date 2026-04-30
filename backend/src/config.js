import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  mongoUrl: process.env.MONGO_URL,
  dbName: process.env.DB_NAME,
  port: parseInt(process.env.PORT, 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  paymentEnabled: process.env.PAYMENT_ENABLED === 'true',
  trialMode: process.env.TRIAL_MODE !== 'false',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  trialDays: parseInt(process.env.TRIAL_DAYS || '14', 10),
  frontendUrl: process.env.FRONTEND_URL || '',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

// Production fail-fast guards. In production we refuse to start with missing
// secrets/connection strings rather than crashing later at runtime.
if (config.nodeEnv === 'production' && !config.jwtSecret) {
  console.error('[fatal] JWT_SECRET must be set in production');
  process.exit(1);
}
if (config.nodeEnv === 'production' && !config.mongoUrl) {
  console.error('[fatal] MONGO_URL must be set in production');
  process.exit(1);
}

export const PLANS = {
  instagram: {
    id: 'instagram',
    nameKey: 'plan_instagram',
    price: 29.9,
    currency: 'AZN',
    botLimit: 1,
    channelLimit: 1,
    messageLimit: 10000,
    channels: ['instagram'],
  },
  whatsapp: {
    id: 'whatsapp',
    nameKey: 'plan_whatsapp',
    price: 29.9,
    currency: 'AZN',
    botLimit: 1,
    channelLimit: 1,
    messageLimit: 10000,
    channels: ['whatsapp'],
  },
  combo: {
    id: 'combo',
    nameKey: 'plan_combo',
    price: 49.9,
    currency: 'AZN',
    botLimit: 1,
    channelLimit: 2,
    messageLimit: 50000,
    channels: ['instagram', 'whatsapp'],
  },
  business: {
    id: 'business',
    nameKey: 'plan_business',
    price: 99.9,
    currency: 'AZN',
    botLimit: 5,
    channelLimit: 5,
    messageLimit: 150000,
    channels: ['instagram', 'whatsapp'],
  },
};
