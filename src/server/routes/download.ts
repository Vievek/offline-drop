import { Router, Request, Response } from 'express';
import fs from 'fs';
import archiver from 'archiver';
import mime from 'mime-types';
import { StorageManager } from '../../transfer/storage';
import { TelemetryHub } from '../../transfer/progress';

export const downloadRouter = Router();

downloadRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const item = StorageManager.getSharedItemById(id);
  if (!item || !fs.existsSync(item.path)) {
    return res.status(404).send('File or folder not found');
  }

  // If item is a directory, stream as a zip archive
  if (item.isDirectory) {
    const archiveName = `${item.name}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(archiveName)}"`);

    const archive = (archiver as any)('zip', { zlib: { level: 6 } });
    archive.pipe(res);
    archive.directory(item.path, false);
    archive.finalize();
    return;
  }

  // Handle single file streaming with HTTP Range support
  const filePath = item.path;
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = mime.lookup(filePath) || 'application/octet-stream';

  let transferredBytes = 0;
  let lastReport = Date.now();
  let bytesSinceLastReport = 0;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(item.name)}"`,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('data', (chunk) => {
      const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      transferredBytes += len;
      bytesSinceLastReport += len;
      const now = Date.now();
      if (now - lastReport >= 500) {
        const speedMbps = (bytesSinceLastReport * 8) / ((now - lastReport) / 1000) / (1024 * 1024);
        TelemetryHub.broadcast({
          type: 'download_progress',
          fileName: item.name,
          bytesTransferred: start + transferredBytes,
          totalBytes: fileSize,
          speedMbps: parseFloat(speedMbps.toFixed(2)),
          percent: Math.min(100, parseFloat((((start + transferredBytes) / fileSize) * 100).toFixed(1))),
        });
        bytesSinceLastReport = 0;
        lastReport = now;
      }
    });

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(item.name)}"`,
      'Accept-Ranges': 'bytes',
    });

    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => {
      const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      transferredBytes += len;
      bytesSinceLastReport += len;
      const now = Date.now();
      if (now - lastReport >= 500) {
        const speedMbps = (bytesSinceLastReport * 8) / ((now - lastReport) / 1000) / (1024 * 1024);
        TelemetryHub.broadcast({
          type: 'download_progress',
          fileName: item.name,
          bytesTransferred: transferredBytes,
          totalBytes: fileSize,
          speedMbps: parseFloat(speedMbps.toFixed(2)),
          percent: Math.min(100, parseFloat(((transferredBytes / fileSize) * 100).toFixed(1))),
        });
        bytesSinceLastReport = 0;
        lastReport = now;
      }
    });

    stream.on('end', () => {
      TelemetryHub.broadcast({
        type: 'transfer_complete',
        fileName: item.name,
        totalBytes: fileSize,
      });
    });

    stream.pipe(res);
  }
});
