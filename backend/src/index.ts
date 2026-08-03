import express from 'express';
import cors from 'cors';
import { env } from './lib/env';
import { errorHandler, notFoundHandler } from './lib/errors';
import { connectRabbitMQ, closeRabbitMQ, isRabbitConnected } from './lib/rabbitmq';
import { ensureUploadDir, uploadDir } from './lib/upload';
import userRoutes from './modules/user/user.routes';
import donationRoutes from './modules/donation/donation.routes';

// Registers the Express Request augmentation (req.auth, req.dbUser).
import './types/auth';

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Donation photos are written to disk by multer and served back from here.
ensureUploadDir();
app.use('/uploads', express.static(uploadDir, { maxAge: '1h' }));

/** Liveness and dependency check, used by the deployment health probe. */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'FoodShare API',
    environment: env.nodeEnv,
    rabbitmq: isRabbitConnected() ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

app.use('/api/users', userRoutes);
app.use('/api/donations', donationRoutes);

// Registered last: unmatched routes, then the single error formatter.
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.port, async () => {
  console.log(`FoodShare API is running at http://localhost:${env.port}`);
  if (env.auth.devBypass) {
    console.warn('AUTH_DEV_BYPASS is on: bearer tokens are decoded, not verified. Development only.');
  }
  await connectRabbitMQ();
});

/** Close the broker connection cleanly so in-flight publishes are not cut off. */
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down.`);
  server.close();
  await closeRabbitMQ();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

export default app;
