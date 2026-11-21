import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import config from '../config.js';
import { authenticate, requireRoles, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const fileTypes = {
  'image/jpeg': { extension: 'jpg', matches: (body: Buffer) => body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  'image/png': { extension: 'png', matches: (body: Buffer) => body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/webp': { extension: 'webp', matches: (body: Buffer) => body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP' },
  'image/gif': { extension: 'gif', matches: (body: Buffer) => /^GIF8[79]a$/.test(body.toString('ascii', 0, 6)) },
  'video/mp4': { extension: 'mp4', matches: (body: Buffer) => body.toString('ascii', 4, 8) === 'ftyp' },
  'video/quicktime': { extension: 'mov', matches: (body: Buffer) => body.toString('ascii', 4, 8) === 'ftyp' },
  'video/webm': { extension: 'webm', matches: (body: Buffer) => body.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) },
};

const limit = 24 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: limit, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype in fileTypes),
}).single('file');

function storageSettings() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) return null;
  const origin = new URL(SUPABASE_URL);
  if (origin.protocol !== 'https:' || origin.username || origin.password) throw new Error('Invalid storage URL');
  return {
    api: new URL('/storage/v1/object/', origin),
    key: SUPABASE_SERVICE_ROLE_KEY,
    bucket: encodeURIComponent(SUPABASE_STORAGE_BUCKET),
  };
}

router.post('/', authenticate, requireRoles(['RESTAURANT_OWNER', 'MANAGER']), (req: AuthRequest, res) => {
  const tenant = req.user?.restaurantId;
  if (!tenant) {
    res.status(403).json({ error: 'Restoran a’zoligi talab qilinadi' });
    return;
  }

  upload(req, res, async error => {
    if (error) {
      res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'Faylni va hajmini tekshiring' });
      return;
    }
    const file = req.file;
    const type = file && fileTypes[file.mimetype as keyof typeof fileTypes];
    if (!file || !type || !type.matches(file.buffer)) {
      res.status(400).json({ error: 'Fayl formati qo‘llab-quvvatlanmaydi' });
      return;
    }
    try {
      const storage = storageSettings();
      const filename = `${randomUUID()}.${type.extension}`;
      let url: string;
      if (storage) {
        const object = storage.bucket + '/' + encodeURIComponent(tenant) + '/' + filename;
        const form = new FormData();
        form.set('cacheControl', '31536000');
        form.set('file', new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype }), filename);
        const response = await fetch(new URL(object, storage.api), {
          method: 'POST',
          headers: { Authorization: `Bearer ${storage.key}`, apikey: storage.key, 'x-upsert': 'false' },
          body: form,
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error('Storage upload failed');
        await response.body?.cancel();
        url = new URL('public/' + object, storage.api).href;
      } else if (config.nodeEnv === 'production') {
        res.status(503).json({ error: 'Media saqlash xizmati sozlanmagan' });
        return;
      } else {
        await mkdir(config.uploadsDir, { recursive: true });
        await writeFile(path.join(config.uploadsDir, filename), file.buffer, { flag: 'wx' });
        url = '/uploads/' + filename;
      }
      res.json({ url, filename, mimetype: file.mimetype, size: file.size, media_type: file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE' });
    } catch {
      res.status(502).json({ error: 'Mediani saqlashda xatolik' });
    }
  });
});

export default router;
