/** The same-origin address of an account's photo (the panel's relay), versioned so a new photo is never served stale. */
export function avatarUrl(locale: string, userId: string, version: string | null | undefined): string | undefined {
  return version ? `/${locale}/api/panel/users/${userId}/avatar?v=${encodeURIComponent(version)}` : undefined;
}

/** An author's public photo on the site. */
export function authorAvatarUrl(userId: string, version: string | null | undefined): string | undefined {
  return version ? `/authors-avatar/${userId}?v=${encodeURIComponent(version)}` : undefined;
}
