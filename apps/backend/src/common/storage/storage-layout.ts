/**
 * Folder layout of the private store, below its root (the local directory, or the bucket's environment prefix).
 * `site/assets/` holds the images the surfaces render (brand images, profile photos) and `media/<media id>/` the
 * renditions of each image of the media library: random identifiers, never a file name. The database check
 * constraints mirror these paths.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const SITE_FOLDER = 'site/';
export const SITE_ASSETS_FOLDER = `${SITE_FOLDER}assets/`;
export const MEDIA_FOLDER = 'media/';

function uuid(value: string, what: string): string {
  if (!UUID.test(value)) throw new Error(`Invalid ${what} identifier`);
  return value;
}

/** Every rendition of one media item; removed whole when the item is deleted. */
export function mediaFolder(mediaId: string): string {
  return `${MEDIA_FOLDER}${uuid(mediaId, 'media')}/`;
}
