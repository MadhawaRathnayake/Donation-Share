import fs from 'node:fs';
import path from 'node:path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { env } from './env';
import { AppError } from './errors';

/**
 * Donation photo upload (Task 3.2.1).
 *
 * Files are written to a local directory and served back as static assets. The
 * work breakdown names S3 and the architecture report names Azure Blob Storage;
 * both are object stores reached through the same two operations used here
 * (write a file, hand back a URL), so swapping the storage backend later means
 * replacing this module only. Everything downstream just sees `imageUrl`.
 */

export const uploadDir = path.isAbsolute(env.uploads.dir)
  ? env.uploads.dir
  : path.join(process.cwd(), env.uploads.dir);

export const ensureUploadDir = () => {
  fs.mkdirSync(uploadDir, { recursive: true });
};

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensionFor: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureUploadDir();
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    // Never trust the client-supplied filename: it can contain path segments.
    const name = `${Date.now()}-${globalThis.crypto.randomUUID()}${extensionFor[file.mimetype] ?? ''}`;
    callback(null, name);
  },
});

const multerHandler = multer({
  storage,
  limits: { fileSize: env.uploads.maxBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError(400, 'UNSUPPORTED_MEDIA_TYPE', 'Upload a JPEG, PNG or WebP image.'));
      return;
    }
    callback(null, true);
  },
}).single('image');

/**
 * Express middleware that accepts an optional `image` field.
 *
 * Multer reports problems with its own error type, which would otherwise reach
 * the generic handler and surface as a 500. Translating them here means an
 * oversized upload gets a 400 with a message the donor can act on.
 */
export const acceptDonationImage = (req: Request, res: Response, next: NextFunction) => {
  multerHandler(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? `Image must be smaller than ${Math.round(env.uploads.maxBytes / (1024 * 1024))} MB.`
        : 'The image could not be uploaded.';
      next(new AppError(400, 'UPLOAD_ERROR', message));
      return;
    }
    next(error);
  });
};

/** Absolute, browser-usable URL for a stored file. */
export const publicUrlFor = (filename: string) => `${env.publicUrl}/uploads/${filename}`;

/** Best-effort cleanup used when a write fails after the file has landed on disk. */
export const removeUploadedFile = (filename?: string) => {
  if (!filename) return;
  fs.promises.unlink(path.join(uploadDir, filename)).catch(() => undefined);
};
