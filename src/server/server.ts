import http from 'http';
import { createApp } from './app';
import { TelemetryHub } from '../transfer/progress';

export interface ServerInstance {
  server: http.Server;
  port: number;
}

export function startServer(port: number = 3000): Promise<ServerInstance> {
  return new Promise((resolve, reject) => {
    const app = createApp();
    const server = http.createServer(app);

    // Attach WebSocket telemetry server
    TelemetryHub.init(server);

    const tryListen = (currentPort: number) => {
      // Bind to 0.0.0.0 so all interfaces (Wi-Fi, Hotspot, Ethernet) are reachable simultaneously
      server.listen(currentPort, '0.0.0.0', () => {
        resolve({ server, port: currentPort });
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
          tryListen(currentPort + 1);
        } else {
          reject(err);
        }
      });
    };

    tryListen(port);
  });
}

