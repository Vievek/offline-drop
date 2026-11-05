import { WebSocket, WebSocketServer } from 'ws';

export interface TransferEvent {
  type: 'upload_progress' | 'download_progress' | 'transfer_complete' | 'files_updated' | 'peer_connected';
  fileName?: string;
  bytesTransferred?: number;
  totalBytes?: number;
  speedMbps?: number;
  percent?: number;
  data?: any;
}

export class TelemetryHub {
  private static wss: WebSocketServer | null = null;
  private static clients: Set<WebSocket> = new Set();

  static init(server: any): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      this.broadcast({
        type: 'peer_connected',
        data: { activePeers: this.clients.size },
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });
  }

  static broadcast(event: TransferEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  static getConnectedCount(): number {
    return this.clients.size;
  }
}

