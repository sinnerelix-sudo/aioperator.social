import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { connectDB } from './db.js';
import authRouter from './routes/auth.js';
import botsRouter from './routes/bots.js';
import productsRouter from './routes/products.js';
import activitiesRouter from './routes/activities.js';
import subscriptionRouter from './routes/subscription.js';
import trainingRouter from './routes/training.js';
import botGroupsRouter from './routes/botGroups.js';
import meRouter from './routes/me.js';
import publicRouter from './routes/public.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan('tiny'));

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (config.corsOrigins.length === 0) return cb(null, true);
    const ok =
      config.corsOrigins.includes(origin) ||
      /\.preview\.emergentagent\.com$/.test(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin);
    return cb(null, ok);
  },
  credentials: true,
};
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.get('/api/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = mongoose.connection?.readyState ?? 0;
  res.json({
    ok: true,
    service: 'ai-operator-backend',
    version: '1.1.0',
    db: states[dbState] || 'unknown',
    trialMode: config.trialMode,
    paymentEnabled: config.paymentEnabled,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/bots', botsRouter);
app.use('/api/bots/:id/training', trainingRouter);
app.use('/api/bot-groups', botGroupsRouter);
app.use('/api/products', productsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/me', meRouter);
app.use('/api/public', publicRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    error: err.code || 'server_error',
    message: err.message || 'Internal Server Error',
  });
});

async function start() {
  try {
    await connectDB();
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`[backend] listening on :${config.port} (${config.nodeEnv})`);
      console.log(`[backend] trialMode=${config.trialMode} paymentEnabled=${config.paymentEnabled}`);
    });
  } catch (err) {
    console.error('[backend] startup error', err);
    process.exit(1);
  }
}

start();

export default app;
