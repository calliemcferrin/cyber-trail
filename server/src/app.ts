/**
 * Express application with security hardening wired in from the start.
 *
 * Controls applied here (see SECURITY.md):
 *  - helmet: strict security headers incl. a locked-down CSP
 *  - CORS: explicit origin allow-list (no wildcard)
 *  - rate limiting: per-IP throttle to resist brute force / abuse / DoS
 *  - body size limit: bounded JSON payloads
 *  - validation + generic error handling in the routers/middleware
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { gameRouter } from './routes/game.js';
import { contentRouter } from './routes/content.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Trust the first proxy hop only (needed for correct client IPs behind a
  // reverse proxy, without blindly trusting arbitrary X-Forwarded-For chains).
  app.set('trust proxy', 1);

  // Remove the framework fingerprint.
  app.disable('x-powered-by');

  // Security headers. This is a JSON API, so lock the CSP down hard: no scripts,
  // no framing, no object/embed. The client app sets its own CSP separately.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // CORS allow-list: only configured origins, and reject unknown ones.
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / tools with no Origin header (e.g. curl, health checks).
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      maxAge: 600,
    }),
  );

  // Bounded JSON bodies — reject anything suspiciously large.
  app.use(express.json({ limit: '16kb' }));

  // Global rate limit: generous for gameplay, strict enough to blunt abuse.
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests.', code: 'rate_limited' },
  });
  app.use('/api', limiter);

  // Health check (no sensitive detail).
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Feature routers.
  app.use('/api/content', contentRouter);
  app.use('/api/game', gameRouter);

  // 404 + centralized error handling (generic responses).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
