# Frontend conventions

- **Data access.** Server components and server actions call the API through `panelApi(path, { permission, schema })`
  (`components/admin/api-call.ts`, server-only): the session comes from the HttpOnly cookie, the permission is checked
  first (the API checks again), the answer is validated against a zod contract, and every refusal becomes an `ApiResult`.
  A `"use server"` module never exports a function that takes an API path; writes are one line over `saveResource`,
  `removeResource`, `reorderResource` or `actOnResource` (`components/admin/resource.ts`).
- **Contracts** are zod schemas beside each feature (`components/<feature>/contracts.ts`) mirroring the API's views exactly.
- **Component library.** Screens are thin compositions of `@/components/ui`: `Page`, `Section`, `Stat`, `Notice`,
  `DetailList`, `DataView` + `RowMenu`, `AutoForm`/`FormModal` (forms described by fields and a zod schema; bilingual fields
  get the `PT | EN` switch automatically), `ResourceManager`, `EmptyState`, `useConfirmation`, `useApiAction`, `useFormat`.
  Add a missing piece to the library instead of copying markup; a test forbids importing the shared controls from `@mantine/core`.
- **Lists have two views by default, rows and cards** (the AR Ética pattern, with Lora's animations). `DataView` draws
  both from the same columns: each column says its place on a card with `card` (`cover` edge to edge on top and a
  thumbnail of `width` in the rows, `title`, `aside` beside the title, `hidden` for rows only; any other column is a
  labelled detail). `useListingView(listing, fallback = "grid")` keeps the reader's choice per listing in the browser and
  returns `{ view, toggle }`: put `toggle` in the listing's header (`Section` actions or a `FilterBar`) and pass `view` to
  `DataView`. `ResourceManager` does it by itself. A dense log may start as rows (`useListingView("audit", "list")`).
- **List motion and style:** rows and cards enter one after the other (25 ms apart, the first eight), so switching views
  or pages animates; rows have a quiet uppercase header, a tinted hover with an accent bar and actions that come forward
  on hover; cards lift with a band in the theme's colours. A list that draws its own items (a picker's tiles) wraps them
  in `ListingView` for the same entrance. `prefers-reduced-motion` turns the motion off. Styles read only theme tokens
  (`data-view.module.css`, `shared/listing.module.css`); in the cards view the surrounding `Section` drops its frame.
- **Files and streams** go through relays under `/<locale>/api/panel/...` (`components/shared/file-relay.ts`): uploads are
  streamed (`forwardUpload`), the AI writer's answer is relayed as server-sent events (`forwardEventStream`), public
  images through `forwardPublicImage`. Browser uploads use `uploadFile` (`components/shared/file-transfer.ts`) for progress.
- **Theme.** Components read the theme's CSS variables (`--app-primary`, `--app-secondary`, `--app-background`, `--app-surface`,
  `--app-highlight`, `--app-border`, `--app-ink`, `--app-muted`, `--app-radius`) and Mantine's `brand`/`accent` colours;
  never a fixed colour or typeface. The root `<html>` carries `data-surface`, `data-header` and `data-cards` for layout choices.
- **Article bodies** are rendered by `ArticleBody` (`components/forms/article-body.tsx`) from the strict grammar; never
  `dangerouslySetInnerHTML`.
- **Navigation never waits in silence:** a `loading.tsx` in every folder with pages (`AdminPageSkeleton`, `SitePageSkeleton`),
  independent API calls awaited together. A server page answers a missing record with `<PageNotFound />`.
- Every modal is the shared `Modal`; every destructive action asks through `useConfirmation`.
- The panel's menu and breadcrumbs are data (`components/layout/area-navigation.ts`), filtered by the account's permissions.
