import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createApiRouter } from './routes.js';
import type { SessionStore } from '../session/store.js';
import { ClocktowerError } from '../errors.js';

export function createApp(store: SessionStore, allowedOrigins: string[] = ['http://localhost:5173']) {
  const app = express();
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());
  app.use('/api', createApiRouter(store));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ClocktowerError) {
      res.status(err.httpStatus).json({ error: { code: err.code, message: err.message } });
      return;
    }
    console.error('Unexpected API error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
  });

  return app;
}
