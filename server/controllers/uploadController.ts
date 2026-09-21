import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

// Raster formats only. SVG is deliberately excluded: uploads are served from the
// same origin as the app, and an SVG can carry inline script.
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export class UploadController {
  /**
   * Accepts a raw image body (Content-Type: image/png|jpeg|gif|webp) and stores it
   * on disk. Returns a short URL that is what actually travels in quiz payloads —
   * image bytes must never ride along in the Socket.IO state broadcast.
   */
  public static async uploadImage(req: Request, res: Response) {
    try {
      const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ext = ALLOWED_TYPES[contentType];

      if (!ext) {
        return res.status(400).json({
          error: `Unsupported image type "${contentType || 'unknown'}". Allowed: PNG, JPEG, GIF, WEBP.`,
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'Empty image upload' });
      }

      if (req.body.length > MAX_IMAGE_BYTES) {
        return res.status(413).json({ error: 'Image exceeds the 5 MB limit' });
      }

      ensureUploadsDir();

      // Filename is fully server-generated, so no client string reaches the filesystem.
      const filename = `img_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.body);

      return res.status(201).json({
        url: `/api/uploads/${filename}`,
        filename,
        sizeBytes: req.body.length,
      });
    } catch (err) {
      console.error('Image upload error:', err);
      return res.status(500).json({ error: 'Failed to store uploaded image' });
    }
  }
}
