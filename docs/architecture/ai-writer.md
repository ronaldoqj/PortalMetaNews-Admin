# AI writer

Rules of the AI writer. Guide: [Redator com IA](../redator-com-ia.md).

- API: `modules/ai-writer` (`AiWriterService`, `AiWriterController` under `panel/ai-writer`), every route `ai:use`. Prompts live
  only in `common/ai/prompts.ts` (`writerSystem`, `STRUCTURE_SYSTEM`, `ARTICLE_SCHEMA`, `imagePrompt`), each appending the
  newsroom's style guide (`settings.ai_guidelines`). The model receives the brief, the conversation (last 8 complete turns),
  the active sections and the style guide — nothing else of the newsroom.
- Conversations and messages (`ai_conversations`, `ai_messages`) belong to one account: every query is scoped by `user_id`
  and a foreign conversation answers 404. Options (`language`, `tone`, `length`, `image`) are validated by the API and may
  change per request.
- An answer is three steps streamed as server-sent events — `user`, `status` (`writing` → `structuring` → `illustrating`),
  `delta`, `proposal`, `image`, then `done` or `error`. Everything that can refuse a request (not the account's
  conversation, an answer already streaming, no provider) answers an ordinary HTTP error before the stream opens.
  Closing the connection aborts the provider and keeps what was written (`stopped`); a message left `streaming` for 5
  minutes is shown as `interrupted`.
- The structuring step returns JSON against `ARTICLE_SCHEMA`; `normalizeProposal` bounds every string, passes bodies
  through `lenientArticleHtml` (so only the article grammar is stored), keeps a section only when its slug exists and at
  most five tags. A proposal without any language holding a title and a body is dropped (`structure_failed`).
- Covers are generated through `MediaService.generate` (requires `media:manage` as well) and stored in the media library as
  `source = 'ai'` with the prompt; a failed image never fails the answer (`image_failed`).
- `apply` (`target: new | linked`) creates a draft through `NewsService.create` (author = the account, both languages,
  section, tags via `TagsService.ensure`, chosen cover, `aiAssisted`, translation sync enabled from the writing language)
  or updates the conversation's linked item through `NewsService.update` (which checks edit rights and records a
  revision). The proposal then stores `newsId`.
- Frontend: `components/writer` — contracts mirror the API views exactly (`writerEventSchema` refuses unknown events);
  the browser posts briefs only to the same-origin relay `/[locale]/api/panel/ai-writer/conversations/[id]/messages`
  (same-origin check, session from the HttpOnly cookie, body validated, stream relayed unbuffered). The written Markdown
  is rendered as React elements (`ArticleMarkdown`, raw HTML dropped by `remark-rehype`, images not drawn); proposal
  bodies through `ArticleBody`. Server actions take fixed paths only.
- Without a key outside production the deterministic `LocalProvider` answers (marked translations, the brief arranged as
  an article, an abstract placeholder cover); the interface says so.
