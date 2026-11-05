import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import busboy from 'busboy';
import { StorageManager } from '../../transfer/storage';
import { TelemetryHub } from '../../transfer/progress';

export const uploadRouter = Router();

uploadRouter.post('/', (req: Request, res: Response) => {
  const uploadDir = StorageManager.getUploadDir();
  const bb = busboy({ headers: req.headers });

  const uploadedFiles: string[] = [];
  let currentFileName = 'upload';
  let bytesReceived = 0;
  let lastReport = Date.now();
  let bytesSinceLastReport = 0;
  const rawLength = req.headers['content-length'];
  const contentLength = rawLength ? parseInt(rawLength, 10) : 0;

  bb.on('file', (_name, fileStream, info) => {
    const filename = info?.filename || `file_${Date.now()}`;
    currentFileName = filename;

    // Sanitize filename to avoid path traversal
    const safeName = path.basename(filename);
    const saveTo = path.join(uploadDir, safeName);
    uploadedFiles.push(safeName);

    const writeStream = fs.createWriteStream(saveTo);

    fileStream.on('data', (data) => {
      const len = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
      bytesReceived += len;
      bytesSinceLastReport += len;
      const now = Date.now();
      if (now - lastReport >= 500) {
        const speedMbps = (bytesSinceLastReport * 8) / ((now - lastReport) / 1000) / (1024 * 1024);
        TelemetryHub.broadcast({
          type: 'upload_progress',
          fileName: currentFileName,
          bytesTransferred: bytesReceived,
          totalBytes: contentLength,
          speedMbps: parseFloat(speedMbps.toFixed(2)),
          percent: contentLength > 0 ? Math.min(100, parseFloat(((bytesReceived / contentLength) * 100).toFixed(1))) : 0,
        });
        bytesSinceLastReport = 0;
        lastReport = now;
      }
    });

    fileStream.pipe(writeStream);
  });

  bb.on('close', () => {
    TelemetryHub.broadcast({
      type: 'transfer_complete',
      fileName: currentFileName,
      totalBytes: bytesReceived,
    });

    res.json({
      success: true,
      message: `Uploaded ${uploadedFiles.length} file(s) successfully`,
      files: uploadedFiles,
      saveDirectory: uploadDir,
    });
  });

  bb.on('error', (err) => {
    console.error('Upload streaming error:', err);
    res.status(500).json({ error: 'Failed to process file upload stream' });
  });

  req.pipe(bb);
});
