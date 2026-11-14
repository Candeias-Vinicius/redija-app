import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { config } from './config.ts';

const server = serve({ fetch: createApp().fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`redija-import-service ouvindo na porta ${info.port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
