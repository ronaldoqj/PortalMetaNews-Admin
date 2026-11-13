# Internationalization

- Two languages, `pt` (Brazilian Portuguese) and `en`, both complete. They are the route prefixes (`/pt/...`, `/en/...`) and
  the languages of everything the newsroom writes. The list lives in `i18n/locales.ts` and the API's `common/i18n/locales.ts`
  (contract-tested); adding a language also means database checks and a catalog.
- Every page has one internal route (`/site/news/[slug]`, `/panel/news/[id]`) and a localized address per language in
  `i18n/routing.ts` (`/pt/noticia/...`, `/en/news/...`). Components never write a localized path.
- Catalogs are split in parts under `apps/frontend/messages/<locale>/` (`common`, `panel`, `newsroom`, `writer`, `themes`,
  `admin`, `site`); a namespace lives in one part, both languages have the same keys and ask for the same ICU arguments
  (`messages.test.ts`). Name messages with literal strings, never build a namespace from data.
- The site's browser receives only the namespaces in `CLIENT_NAMESPACES.site` (`i18n/client-messages.ts`); the panel's
  receives the whole catalog.
- Newsroom copy is `I18nString` (`{ pt?, en? }`): edited with `I18nTextInput` under a `PT | EN` switch, resolved with
  `resolveI18nString`, which falls back to the other language when one is blank (names of sections and tags, captions,
  bios). News are stricter: an item appears on a language's pages only when published in that language.
- Machine translation (`POST panel/translate`) serves the builder's sync and any bilingual field; nothing is stored by it.
