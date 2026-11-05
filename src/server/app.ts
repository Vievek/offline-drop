import express from 'express';
import path from 'path';
import { SessionManager } from '../security/session';
import { apiRouter } from './routes/api';
import { downloadRouter } from './routes/download';
import { uploadRouter } from './routes/upload';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  // Static web assets
  const publicDir = path.join(__dirname, '..', '..', 'public');
  app.use(express.static(publicDir));

  // Security guard middleware for sensitive endpoints
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.query.token as string || req.headers['x-session-token'] as string;
    if (SessionManager.validateToken(token)) {
      return next();
    }
    // Allow public access to index page and public assets, but guard transfers
    return res.status(401).json({ error: 'Unauthorized. Please scan the QR code or enter PIN.' });
  };

  app.use('/api', apiRouter);
  app.use('/download', authMiddleware, downloadRouter);
  app.use('/upload', authMiddleware, uploadRouter);

  return app;
}

