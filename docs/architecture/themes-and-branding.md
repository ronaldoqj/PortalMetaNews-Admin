# Themes and branding

Rules of themes, brand images and site details. Guide: [Temas e identidade visual](../temas-e-identidade-visual.md).

- A theme is a complete token set: `light` and `dark` palettes (8 `#rrggbb` colours each), `inputStyle` (`variant`, `shape`),
  `typography` (`fontHeadings`, `fontBody` from `FONT_OPTIONS`), `radius` and `site` (`header`, `cards`). The API validates
  it with `parseThemeTokens` (`modules/site/theme-tokens.ts`, exact keys, closed lists); the frontend mirrors it as
  `brandingSchema` (`tokens/branding.ts`, contract-tested lists). Stored in `themes.tokens`.
- `settings.site_theme_id` and `settings.panel_theme_id` choose what each surface renders. `public/site` answers both active
  token sets on every page request; the root layout renders the surface's tokens as CSS variables during SSR
  (`brandingStylesheet`), so a change shows on the next page with no flash. Components read only the variables
  (`--app-*`, `--app-radius`, Mantine's font variables) and never hold a fixed colour or typeface; the site reads the
  layout choices from `data-header` / `data-cards` on `<html>`.
- System themes (`is_system`, with a slug) can be edited and duplicated but never deleted (database trigger
  `protect_theme`); an active theme cannot be deleted either (409 `theme_active`). At most 60 themes (`theme_limit`).
  Every change is audited (`theme.created/updated/deleted/activated`) without the tokens.
- All theme routes require `themes:manage`. Import/export is client-side: `theme-file.ts` writes
  `{ format: "portal-meta-news/theme", version: 1, name, description, tokens }` and reads it back (or bare tokens) only
  when it validates completely, under 64 KB; the API validates again on create.
- The editor's preview scopes the edited scheme's variables to its own element (`previewVariables`), so the miniature
  (and the real Mantine field inside it) shows unsaved tokens without touching the panel's theme.
- Brand images (`logo`, `logoDark`, `favicon`, `faviconDark`, `social`) are uploaded through the same-origin relay
  `/[locale]/api/panel/site-assets/[slot]` (`themes:manage`), rebuilt by the API (`renderBrandingImage`: WebP logos,
  PNG favicons, 1200×630 JPEG share image, no metadata), stored under random immutable keys and served publicly by
  `/brand-assets/[file]`. The previous object is deleted only after the new reference is committed. Without an own image
  a page uses the bundled identity (`bundledAssets`); one image of a pair serves both schemes.
- Site details (`panel/site`, `site:manage`): name (≤ 80), tagline (≤ 160) and description (≤ 300) as `I18nString`,
  default locale, contact e-mail and social profile URLs (`https://` only, eight known networks).
