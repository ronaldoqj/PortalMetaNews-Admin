/**
 * Mirrors the API limits for members' photos. The browser checks only improve feedback: the API
 * detects the real type from the file's leading bytes and rebuilds every photo without metadata.
 */
export const AVATAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_UPLOAD_ACCEPT = { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"] };

export type AvatarError = "tooLarge" | "unsupportedType" | "invalidInput" | "forbidden" | "unavailable";

export function avatarFileError(file: { size: number; type: string }): AvatarError | undefined {
  if (!(file.type in AVATAR_UPLOAD_ACCEPT)) return "unsupportedType";
  if (file.size <= 0) return "invalidInput";
  if (file.size > AVATAR_UPLOAD_MAX_BYTES) return "tooLarge";
  return undefined;
}

export function avatarErrorKey(error: string): AvatarError {
  return ["tooLarge", "unsupportedType", "invalidInput", "forbidden"].includes(error) ? error as AvatarError : "unavailable";
}
