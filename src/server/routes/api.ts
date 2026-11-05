import { Router, Request, Response } from 'express';
import { StorageManager } from '../../transfer/storage';
import { SessionManager } from '../../security/session';
import { NetworkDiscovery } from '../../network/discovery';
import { TelemetryHub } from '../../transfer/progress';

export const apiRouter = Router();

// Validate token or pin
apiRouter.post('/auth', (req: Request, res: Response) => {
  const { pin, token } = req.body || {};
  if (SessionManager.validateToken(token) || pin === SessionManager.getPin()) {
    return res.json({ ok: true, token: SessionManager.getToken() });
  }
  return res.status(401).json({ ok: false, error: 'Invalid PIN or session token' });
});

// Get file manifests & system status
apiRouter.get('/manifest', (_req: Request, res: Response) => {
  res.json({
    items: StorageManager.getSharedItems(),
    peers: TelemetryHub.getConnectedCount(),
    uploadDir: StorageManager.getUploadDir(),
  });
});

// Network info endpoint for UI
apiRouter.get('/networks', (_req: Request, res: Response) => {
  res.json({
    interfaces: NetworkDiscovery.getLanInterfaces(),
    currentPin: SessionManager.getPin(),
  });
});

