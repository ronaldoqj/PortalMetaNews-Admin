"use client";

import { File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileType, FileVideo, Presentation, type LucideIcon } from "lucide-react";

/** What kind of file a name or media type is, as far as the interface cares: which icon and which colour. */
const KINDS: ReadonlyArray<[RegExp, LucideIcon, string]> = [
  [/pdf$/, FileText, "red"],
  [/^image\/|\.(png|jpe?g|webp|gif|svg|tiff?)$/, FileImage, "grape"],
  [/word|opendocument\.text|\.(docx?|odt|rtf)$/, FileType, "blue"],
  [/sheet|excel|csv|\.(xlsx?|ods|csv)$/, FileSpreadsheet, "green"],
  [/presentation|powerpoint|\.(pptx?|odp)$/, Presentation, "orange"],
  [/^audio\/|\.(mp3|wav|ogg|m4a)$/, FileAudio, "cyan"],
  [/^video\/|\.(mp4|webm|mov)$/, FileVideo, "pink"],
  [/zip|compressed|\.(zip|rar|7z|tar|gz)$/, FileArchive, "yellow"],
  [/^text\/|\.(txt|md)$/, FileText, "gray"],
];

/** The icon of a file by its media type or name, in that kind's colour. */
export function FileIcon({ type = "", name = "", size = 20 }: { type?: string; name?: string; size?: number }) {
  const subject = `${type.toLowerCase()} ${name.toLowerCase()}`;
  const [, Icon, color] = KINDS.find(([pattern]) => subject.split(" ").some((part) => pattern.test(part))) ?? [null, File, "gray"];
  return <Icon size={size} aria-hidden="true" style={{ color: `var(--mantine-color-${color}-6)`, flexShrink: 0 }} />;
}
