import { randomBytes } from 'node:crypto';
import { SITE_ASSETS_FOLDER } from './storage-layout.js';

/**
 * Profile photos of the panel's accounts, also shown beside an article's byline. Each upload gets a new random key,
 * so a stale photo is never served under the current version.
 */
export function avatarKey(): string {
  return `${SITE_ASSETS_FOLDER}avatars/avatar-${randomBytes(16).toString('hex')}.webp`;
}
