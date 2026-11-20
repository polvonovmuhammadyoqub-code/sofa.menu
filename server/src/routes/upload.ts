import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Faqat rasm (JPEG, PNG, WebP) yoki video (MP4, WebM) formatidagi fayllar qabul qilinadi.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (for short videos)
  },
});

router.post('/', authenticate, upload.single('file'), (req: AuthRequest, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fayl yuklanmadi' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const isVideo = req.file.mimetype.startsWith('video/');

    res.json({
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      media_type: isVideo ? 'VIDEO' : 'IMAGE',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Faylni yuklashda xatolik' });
  }
});

export default router;
