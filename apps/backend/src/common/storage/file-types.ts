import { UnsupportedMediaTypeException } from '@nestjs/common';

/**
 * Content-based file policy. The media type of a stored file always comes from its leading bytes (and, for
 * containers and plain text, from its extension once the bytes agree), never from what the browser declared.
 * A firm keeps every kind of file a case produces, so unknown formats are accepted as opaque downloads; only
 * programs and scripts are refused. What a browser may render inline is a short allowlist: everything else is
 * always sent as an attachment (`document-http.ts`).
 */

export const MAX_IMAGE_PIXELS = 100_000_000;
export const DEFAULT_MAX_UPLOAD_MB = 50;
export const MAX_FILENAME_LENGTH = 255;
/** How many leading bytes classification needs. */
export const SNIFF_BYTES = 8192;

export type DocumentKind = 'pdf' | 'word' | 'spreadsheet' | 'presentation' | 'text' | 'image' | 'audio' | 'video' | 'email' | 'archive' | 'other';

export interface FileType {
  mimeType: string;
  /** Lowercase, without the dot; what the stored name ends with. */
  extension: string;
  kind: DocumentKind;
  /** Whether its text can be read for search and the assistant. */
  extractable: boolean;
  /** Whether a browser may render it in place; anything else is only downloaded. */
  inline: boolean;
}

const type = (mimeType: string, extension: string, kind: DocumentKind, extractable = false, inline = false): FileType =>
  ({ mimeType, extension, kind, extractable, inline });

const PDF = type('application/pdf', 'pdf', 'pdf', true, true);
const IMAGES = {
  png: type('image/png', 'png', 'image', false, true),
  jpeg: type('image/jpeg', 'jpg', 'image', false, true),
  gif: type('image/gif', 'gif', 'image', false, true),
  webp: type('image/webp', 'webp', 'image', false, true),
  tiff: type('image/tiff', 'tiff', 'image'),
  bmp: type('image/bmp', 'bmp', 'image'),
} as const;

/** ZIP containers told apart by extension: the Office and OpenDocument formats, else a plain archive. */
const ZIP_TYPES: Record<string, FileType> = {
  docx: type('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx', 'word', true),
  xlsx: type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', 'spreadsheet'),
  pptx: type('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx', 'presentation'),
  odt: type('application/vnd.oasis.opendocument.text', 'odt', 'word'),
  ods: type('application/vnd.oasis.opendocument.spreadsheet', 'ods', 'spreadsheet'),
  odp: type('application/vnd.oasis.opendocument.presentation', 'odp', 'presentation'),
  zip: type('application/zip', 'zip', 'archive'),
};
/** Legacy Office files (OLE compound documents), told apart by extension. */
const OLE_TYPES: Record<string, FileType> = {
  doc: type('application/msword', 'doc', 'word'),
  xls: type('application/vnd.ms-excel', 'xls', 'spreadsheet'),
  ppt: type('application/vnd.ms-powerpoint', 'ppt', 'presentation'),
  msg: type('application/vnd.ms-outlook', 'msg', 'email'),
};
/** Plain-text formats, accepted only when the bytes really are text. HTML, XML and SVG are never rendered inline. */
const TEXT_TYPES: Record<string, FileType> = {
  txt: type('text/plain', 'txt', 'text', true, true),
  md: type('text/markdown', 'md', 'text', true, true),
  csv: type('text/csv', 'csv', 'text', true, true),
  json: type('application/json', 'json', 'text', true, true),
  log: type('text/plain', 'log', 'text', true, true),
  xml: type('application/xml', 'xml', 'text', true),
  html: type('text/html', 'html', 'text', true),
  htm: type('text/html', 'htm', 'text', true),
  eml: type('message/rfc822', 'eml', 'email', true),
  rtf: type('application/rtf', 'rtf', 'word'),
  svg: type('image/svg+xml', 'svg', 'image'),
};
const MEDIA = {
  mp3: type('audio/mpeg', 'mp3', 'audio', false, true),
  wav: type('audio/wav', 'wav', 'audio', false, true),
  ogg: type('audio/ogg', 'ogg', 'audio', false, true),
  m4a: type('audio/mp4', 'm4a', 'audio', false, true),
  mp4: type('video/mp4', 'mp4', 'video', false, true),
  mov: type('video/quicktime', 'mov', 'video'),
  webm: type('video/webm', 'webm', 'video', false, true),
  mkv: type('video/x-matroska', 'mkv', 'video'),
} as const;

/** Programs and scripts: refused whatever they are named, and whatever name they hide behind. */
const REFUSED_EXTENSIONS = new Set([
  'exe', 'dll', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'cpl', 'jar', 'apk', 'app', 'dmg', 'deb', 'rpm', 'sh', 'bash', 'ps1', 'vbs', 'vbe', 'js', 'mjs',
  'jse', 'wsf', 'wsh', 'hta', 'lnk', 'reg', 'php', 'py', 'pl', 'rb', 'so', 'dylib', 'bin', 'iso',
]);

const starts = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));

/** Extracts the lowercase extension of a file name, ignoring any directory component. */
export function extractFileExtension(filename: unknown): string | undefined {
  if (typeof filename !== 'string') return undefined;
  const baseName = filename.split(/[\\/]/).pop() ?? '';
  const dotIndex = baseName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === baseName.length - 1) return undefined;
  const extension = baseName.slice(dotIndex + 1).toLowerCase();
  return /^[a-z0-9]{1,16}$/.test(extension) ? extension : undefined;
}

/** PNG, JPEG or WebP by their leading bytes: the only images the brand and profile slots accept. */
export function detectImageType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | undefined {
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (bytes.length >= 12 && starts(bytes, ascii('RIFF')) && starts(bytes, ascii('WEBP'), 8)) return 'image/webp';
  return undefined;
}

function isExecutable(bytes: Uint8Array): boolean {
  return starts(bytes, ascii('MZ')) || starts(bytes, [0x7f, 0x45, 0x4c, 0x46]) || starts(bytes, ascii('#!')) ||
    [[0xfe, 0xed, 0xfa, 0xce], [0xfe, 0xed, 0xfa, 0xcf], [0xcf, 0xfa, 0xed, 0xfe], [0xce, 0xfa, 0xed, 0xfe]].some((magic) => starts(bytes, magic));
}

/** Text without NUL bytes that decodes as UTF-8 (a cut at the end of the sample is tolerated). */
function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true });
    return true;
  } catch {
    // Legacy single-byte encodings (Windows-1252 exports) are text too: no control bytes besides whitespace.
    return bytes.every((value) => value >= 0x20 || value === 0x09 || value === 0x0a || value === 0x0d || value === 0x0c);
  }
}

/**
 * Classifies an uploaded file from its leading bytes and its name. Throws 415 for programs and scripts; a format it
 * does not know is stored as an opaque download.
 */
export function classifyFile(head: Uint8Array, filename: string): FileType {
  const extension = extractFileExtension(filename);
  if (isExecutable(head) || (extension && REFUSED_EXTENSIONS.has(extension))) {
    throw new UnsupportedMediaTypeException({ statusCode: 415, message: 'File type is not accepted', code: 'file_type_refused' });
  }
  if (starts(head, ascii('%PDF-'))) return PDF;
  const image = detectImageType(head);
  if (image) return image === 'image/png' ? IMAGES.png : image === 'image/jpeg' ? IMAGES.jpeg : IMAGES.webp;
  if (starts(head, ascii('GIF87a')) || starts(head, ascii('GIF89a'))) return IMAGES.gif;
  if (starts(head, [0x49, 0x49, 0x2a, 0x00]) || starts(head, [0x4d, 0x4d, 0x00, 0x2a])) return IMAGES.tiff;
  if (starts(head, ascii('BM')) && extension === 'bmp') return IMAGES.bmp;
  if (starts(head, [0x50, 0x4b, 0x03, 0x04]) || starts(head, [0x50, 0x4b, 0x05, 0x06])) return ZIP_TYPES[extension ?? ''] ?? ZIP_TYPES.zip;
  if (starts(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return OLE_TYPES[extension ?? ''] ?? type('application/x-ole-storage', extension ?? 'ole', 'other');
  if (starts(head, ascii('{\\rtf'))) return TEXT_TYPES.rtf;
  if (starts(head, ascii('ID3')) || (head.length > 1 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0 && extension === 'mp3')) return MEDIA.mp3;
  if (starts(head, ascii('RIFF')) && starts(head, ascii('WAVE'), 8)) return MEDIA.wav;
  if (starts(head, ascii('OggS'))) return MEDIA.ogg;
  if (starts(head, ascii('ftyp'), 4)) return extension === 'm4a' ? MEDIA.m4a : extension === 'mov' ? MEDIA.mov : MEDIA.mp4;
  if (starts(head, [0x1a, 0x45, 0xdf, 0xa3])) return extension === 'mkv' ? MEDIA.mkv : MEDIA.webm;
  if (looksLikeText(head)) return TEXT_TYPES[extension ?? ''] ?? TEXT_TYPES.txt;
  return type('application/octet-stream', extension ?? 'bin', 'other');
}

/** The media type a stored file is served with, from what was recorded when it was classified. */
export function isInlineType(mimeType: string): boolean {
  return [PDF, ...Object.values(IMAGES), ...Object.values(TEXT_TYPES), ...Object.values(MEDIA)].some((known) => known.mimeType === mimeType && known.inline);
}

/**
 * The name a file is kept and offered under: its base name only, without control characters, trimmed to
 * {@link MAX_FILENAME_LENGTH} and ending with the extension its content was classified as.
 */
export function storedFileName(original: unknown, extension: string): string {
  const base = typeof original === 'string' ? (original.split(/[\\/]/).pop() ?? '') : '';
  // eslint-disable-next-line no-control-regex
  const clean = base.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  const dot = clean.lastIndexOf('.');
  const stem = (dot > 0 ? clean.slice(0, dot) : clean).replace(/[. ]+$/, '') || 'documento';
  return `${stem.slice(0, MAX_FILENAME_LENGTH - extension.length - 1)}.${extension}`;
}

/** The title a new document starts with: its file name without the extension. */
export function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  return (dot > 0 ? name.slice(0, dot) : name).replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || name;
}
