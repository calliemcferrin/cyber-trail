import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(
    `[cyber-trail] API listening on http://localhost:${config.port} ` +
      `(env=${config.nodeEnv})`,
  );
});

// Graceful shutdown.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[cyber-trail] ${signal} received, shutting down.`);
    server.close(() => process.exit(0));
  });
}
