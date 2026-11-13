import type { Response } from 'express';
import type { Readable } from 'node:stream';
import { pipeToResponse } from './pipe-to-response.js';

/**
 * Streams a public image out of the private store. Every stored image has an immutable key (a new upload gets a new
 * one), so the answer is cached forever; markup is never sniffed and the image cannot run anything if opened alone.
 */
export function sendPublicImage(response: Response, stream: Readable, mimeType: string, cache = 'public, max-age=31536000, immutable'): void {
  response.status(200);
  response.setHeader('Content-Type', mimeType);
  response.setHeader('Cache-Control', cache);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  pipeToResponse(stream, response);
}
