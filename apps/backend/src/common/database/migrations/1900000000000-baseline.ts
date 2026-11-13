import { randomUUID } from 'node:crypto';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The complete schema of a fresh Portal Meta News installation, all in `public`: one portal, one panel.
 *
 * Literal copies of constants (permissions, roles, theme presets) keep this migration stable while the application
 * code evolves; later changes belong in new migrations appended to `migrations/index.ts`.
 */

const PERMISSIONS = [
  'news:read', 'news:write', 'news:edit_all', 'news:publish', 'news:delete', 'taxonomy:manage', 'media:manage', 'ai:use',
  'front_page:manage', 'themes:manage', 'site:manage', 'settings:manage', 'users:manage', 'contacts:read', 'audit:read', 'documentation:read',
];
const SYSTEM_ROLES = [
  { slug: 'admin', name: 'Administrador', description: 'Controle total do portal, inclusive usuários, perfis e integrações.', permissions: PERMISSIONS },
  {
    slug: 'editor', name: 'Editor-chefe', description: 'Edita e publica qualquer notícia, cuida da capa, das editorias e da mídia.',
    permissions: ['news:read', 'news:write', 'news:edit_all', 'news:publish', 'news:delete', 'taxonomy:manage', 'media:manage', 'ai:use',
      'front_page:manage', 'contacts:read', 'documentation:read'],
  },
  { slug: 'reporter', name: 'Repórter', description: 'Escreve as próprias notícias e as envia para revisão.', permissions: ['news:read', 'news:write', 'media:manage', 'ai:use'] },
  { slug: 'reviewer', name: 'Revisor', description: 'Revisa e corrige qualquer notícia, sem publicar.', permissions: ['news:read', 'news:edit_all', 'ai:use'] },
];

const palette = (values: string[]) => Object.fromEntries(
  ['primary', 'secondary', 'background', 'surface', 'highlight', 'border', 'foreground', 'muted'].map((key, index) => [key, values[index]]));
/** The presets the theme manager starts with. System themes can be duplicated and edited, never deleted. */
const THEMES = [
  {
    slug: 'meta-news', name: 'Meta News', description: 'A identidade do portal: cobalto profundo e vermelho de sinal, títulos serifados.',
    tokens: {
      light: palette(['#0F3D91', '#E63946', '#F7F8FA', '#FFFFFF', '#EEF2F8', '#DDE3EC', '#0B1324', '#5B6577']),
      dark: palette(['#7EA6FF', '#FF6B76', '#0A0F1A', '#111827', '#1A2333', '#273246', '#F2F5FA', '#9AA6B8']),
      inputStyle: { variant: 'default', shape: 'default' }, typography: { fontHeadings: 'newsreader', fontBody: 'inter' },
      radius: 'sm', site: { header: 'left', cards: 'flat' },
    },
  },
  {
    slug: 'meta-news-panel', name: 'Meta News — Painel', description: 'As cores do portal com tipografia de interface, para o trabalho da redação.',
    tokens: {
      light: palette(['#0F3D91', '#E63946', '#F4F6FA', '#FFFFFF', '#EAF0F9', '#DDE3EC', '#0B1324', '#5B6577']),
      dark: palette(['#7EA6FF', '#FF6B76', '#0A0F1A', '#111827', '#1A2333', '#273246', '#F2F5FA', '#9AA6B8']),
      inputStyle: { variant: 'default', shape: 'default' }, typography: { fontHeadings: 'manrope', fontBody: 'manrope' },
      radius: 'md', site: { header: 'left', cards: 'outlined' },
    },
  },
  {
    slug: 'classic', name: 'Jornal clássico', description: 'Tinta preta sobre papel, vermelho editorial e cabeçalho centralizado.',
    tokens: {
      light: palette(['#141414', '#B91C1C', '#FBF8F1', '#FFFFFF', '#F3EEE2', '#E2DACA', '#141414', '#5E5A52']),
      dark: palette(['#F2EDE3', '#F87171', '#121110', '#1B1A18', '#24221F', '#3A3631', '#F2EDE3', '#ADA698']),
      inputStyle: { variant: 'outlined', shape: 'square' }, typography: { fontHeadings: 'newsreader', fontBody: 'public-sans' },
      radius: 'none', site: { header: 'centered', cards: 'flat' },
    },
  },
  {
    slug: 'nocturne', name: 'Noturno', description: 'Azul-petróleo e âmbar, pensado primeiro para o modo escuro.',
    tokens: {
      light: palette(['#0E7490', '#D97706', '#F5F7F7', '#FFFFFF', '#E6F1F3', '#D5E2E5', '#0C1B20', '#55666B']),
      dark: palette(['#5EEAD4', '#FBBF24', '#071215', '#0D1D22', '#13272D', '#22393F', '#E8F3F4', '#93AEB3']),
      inputStyle: { variant: 'filled', shape: 'rounded' }, typography: { fontHeadings: 'plus-jakarta-sans', fontBody: 'inter' },
      radius: 'lg', site: { header: 'left', cards: 'elevated' },
    },
  },
];

const CONTACT_TOPICS = ['tip', 'correction', 'advertising', 'press', 'privacy', 'other'];
const array = (values: readonly string[]) => `ARRAY[${values.map((value) => `'${value}'`).join(',')}]::text[]`;
const LOCALES = ['pt', 'en'];

/** A `{ pt?, en? }` text: an object with string entries for the content locales only, each at most `max` long. */
const i18n = (column: string, max: number, required = false) => `CHECK (jsonb_typeof(${column}) = 'object'
  AND ${column} - ${array(LOCALES)} = '{}'::jsonb
  AND NOT jsonb_path_exists(${column}, '$.* ? (@.type() != "string")')
  AND length(coalesce(${column} ->> 'pt', '')) <= ${max} AND length(coalesce(${column} ->> 'en', '')) <= ${max}
  ${required ? `AND length(btrim(coalesce(${column} ->> 'pt', ''))) + length(btrim(coalesce(${column} ->> 'en', ''))) > 0` : ''})`;
/** A `{ pt?, en? }` slug pair: each entry lowercase words joined by hyphens (`public.pmn_valid_slugs`). */
const slugs = (column: string) => `CHECK (public.pmn_valid_slugs(${column}))`;
const ASSET = (column: string, prefix: string, extension: string) => `
  ${column}_key varchar(255) CHECK (${column}_key IS NULL OR ${column}_key ~ '^site/assets/branding/${prefix}-[0-9a-f]{32}[.]${extension}$')`;
/** The searchable text of one language, weighted: title, then subtitle, then body. */
const search = (locale: string) => `setweight(to_tsvector('public.pmn_${locale}'::regconfig, coalesce(title ->> '${locale}', '')), 'A')
  || setweight(to_tsvector('public.pmn_${locale}'::regconfig, coalesce(subtitle ->> '${locale}', '')), 'B')
  || setweight(to_tsvector('public.pmn_${locale}'::regconfig, coalesce(body_text ->> '${locale}', '')), 'C')`;

export class Baseline1900000000000 implements MigrationInterface {
  name = 'Baseline1900000000000';

  async up(runner: QueryRunner): Promise<void> {
    // unaccent makes the search accent-insensitive; pg_trgm answers "title contains" searches.
    await runner.query('CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public');
    await runner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public');
    for (const [name, base, stem] of [['pmn_pt', 'portuguese', 'portuguese_stem'], ['pmn_en', 'english', 'english_stem']]) {
      await runner.query(`CREATE TEXT SEARCH CONFIGURATION public.${name} (COPY = pg_catalog.${base})`);
      await runner.query(`ALTER TEXT SEARCH CONFIGURATION public.${name} ALTER MAPPING FOR hword, hword_part, word WITH public.unaccent, ${stem}`);
    }
    // Case- and accent-insensitive form of a text, immutable so it can be indexed (trigram) and compared.
    await runner.query(`CREATE FUNCTION public.pmn_fold(value text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, value)) $$`);
    await runner.query(`CREATE FUNCTION public.pmn_valid_slugs(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
      AS $$ SELECT jsonb_typeof(value) = 'object' AND value - ${array(LOCALES)} = '{}'::jsonb AND NOT EXISTS (
        SELECT 1 FROM jsonb_each(value) entry WHERE jsonb_typeof(entry.value) <> 'string'
          OR length(entry.value #>> '{}') NOT BETWEEN 1 AND 160 OR (entry.value #>> '{}') !~ '^[a-z0-9]+(-[a-z0-9]+)*$') $$`);
    await runner.query(`CREATE FUNCTION public.keep_singleton() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Settings row cannot be removed' USING ERRCODE = '23514'; END $$`);

    // ---------------------------------------------------------------------------------------------- Access
    await runner.query(`CREATE TABLE public.roles (
      id uuid PRIMARY KEY,
      name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
      slug text NOT NULL UNIQUE CHECK (length(slug) <= 64 AND slug ~ '^[a-z][a-z0-9_]*$'),
      description text CHECK (description IS NULL OR length(description) <= 500),
      is_system boolean NOT NULL DEFAULT false,
      permissions text[] NOT NULL DEFAULT '{}' CHECK (permissions <@ ${array(PERMISSIONS)}),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const role of SYSTEM_ROLES) {
      await runner.query('INSERT INTO public.roles (id, name, slug, description, is_system, permissions) VALUES ($1, $2, $3, $4, true, $5)',
        [randomUUID(), role.name, role.slug, role.description, role.permissions]);
    }
    const baseline = `CASE OLD.slug ${SYSTEM_ROLES.map((role) => `WHEN '${role.slug}' THEN ${array(role.permissions)}`).join(' ')} ELSE OLD.permissions END`;
    await runner.query(`CREATE FUNCTION public.protect_role() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.is_system THEN RAISE EXCEPTION 'System roles cannot be deleted' USING ERRCODE = '23514'; END IF;
          RETURN OLD;
        END IF;
        IF NEW.slug <> OLD.slug OR NEW.is_system <> OLD.is_system OR (OLD.is_system AND NOT NEW.permissions @> (${baseline})) THEN
          RAISE EXCEPTION 'Immutable role attributes' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END $$`);
    await runner.query('CREATE TRIGGER protect_role BEFORE UPDATE OR DELETE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.protect_role()');

    // Every account of the panel. The author fields are what the site shows beside an article's byline.
    await runner.query(`CREATE TABLE public.users (
      id uuid PRIMARY KEY,
      name text NOT NULL DEFAULT '' CHECK (length(name) <= 160),
      email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
      password_hash text NOT NULL,
      role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
      enabled boolean NOT NULL DEFAULT true,
      failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
      locked_until timestamptz,
      requires_password_change boolean NOT NULL DEFAULT false,
      last_login_at timestamptz,
      avatar_key varchar(255) CHECK (avatar_key IS NULL OR avatar_key ~ '^site/assets/avatars/avatar-[0-9a-f]{32}[.]webp$'),
      avatar_updated_at timestamptz,
      job_title jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('job_title', 120)},
      bio jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('bio', 1000)},
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT users_avatar_check CHECK ((avatar_key IS NULL) = (avatar_updated_at IS NULL))
    )`);
    await runner.query(`CREATE TABLE public.sessions (
      token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )`);
    await runner.query('CREATE INDEX sessions_user_idx ON public.sessions (user_id)');
    await runner.query('CREATE INDEX sessions_expiration_idx ON public.sessions (expires_at)');
    await runner.query(`CREATE TABLE public.password_change_tokens (
      token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
      user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )`);
    // Shared budgets of the forms anyone may post, under hashed bucket names; never keyed by a visitor's address.
    await runner.query(`CREATE TABLE public.rate_limits (
      bucket_hash bytea PRIMARY KEY CHECK (octet_length(bucket_hash) = 32),
      attempts integer NOT NULL CHECK (attempts > 0),
      expires_at timestamptz NOT NULL
    )`);

    // Append-only trail of privileged actions: identifiers and decisions, never article text or credentials.
    await runner.query(`CREATE TABLE public.audit_logs (
      id uuid PRIMARY KEY,
      actor_id uuid,
      action text NOT NULL CHECK (action ~ '^[a-z][a-z_]*([.][a-z][a-z_]*)+$'),
      resource_type text,
      resource_id uuid,
      outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'denied')),
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query('CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC, id DESC)');
    await runner.query('CREATE INDEX audit_logs_resource_idx ON public.audit_logs (resource_type, resource_id, created_at DESC)');
    await runner.query(`CREATE FUNCTION public.reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Audit records are immutable'; END $$`);
    await runner.query(`CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.audit_logs
      FOR EACH STATEMENT EXECUTE FUNCTION public.reject_audit_mutation()`);

    // ---------------------------------------------------------------------------------------------- Themes and settings
    await runner.query(`CREATE TABLE public.themes (
      id uuid PRIMARY KEY,
      slug text UNIQUE CHECK (slug IS NULL OR slug ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
      name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
      description text NOT NULL DEFAULT '' CHECK (length(description) <= 300),
      tokens jsonb NOT NULL CHECK (jsonb_typeof(tokens) = 'object' AND tokens ?& ARRAY['light', 'dark', 'inputStyle', 'typography']),
      is_system boolean NOT NULL DEFAULT false,
      created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT themes_system_slug CHECK (NOT is_system OR slug IS NOT NULL)
    )`);
    const themeIds: Record<string, string> = {};
    for (const theme of THEMES) {
      themeIds[theme.slug] = randomUUID();
      await runner.query('INSERT INTO public.themes (id, slug, name, description, tokens, is_system) VALUES ($1, $2, $3, $4, $5::jsonb, true)',
        [themeIds[theme.slug], theme.slug, theme.name, theme.description, JSON.stringify(theme.tokens)]);
    }
    await runner.query(`CREATE FUNCTION public.protect_theme() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.is_system THEN RAISE EXCEPTION 'System themes cannot be deleted' USING ERRCODE = '23514'; END IF;
        RETURN OLD;
      END $$`);
    await runner.query('CREATE TRIGGER protect_theme BEFORE DELETE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.protect_theme()');

    // One row: the portal's identity, the active themes, the front page and the integrations.
    await runner.query(`CREATE TABLE public.settings (
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
      site_name text NOT NULL DEFAULT 'Portal Meta News' CHECK (length(btrim(site_name)) BETWEEN 1 AND 80),
      tagline jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('tagline', 160)},
      description jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('description', 300)},
      default_locale text NOT NULL DEFAULT 'pt' CHECK (default_locale IN ('pt', 'en')),
      contact_email text CHECK (contact_email IS NULL OR (contact_email = lower(contact_email) AND contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+$')),
      social jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(social) = 'object'),
      site_theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE RESTRICT,
      panel_theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE RESTRICT,
      ${ASSET('logo', 'logo', 'webp')}, ${ASSET('logo_dark', 'logodark', 'webp')},
      ${ASSET('favicon', 'favicon', 'png')}, ${ASSET('favicon_dark', 'favicondark', 'png')}, ${ASSET('social', 'social', 'jpg')},
      front_page jsonb NOT NULL DEFAULT '{"headline":null,"highlights":[],"sections":[]}'::jsonb CHECK (jsonb_typeof(front_page) = 'object'),
      ai_provider text NOT NULL DEFAULT 'auto' CHECK (ai_provider IN ('auto', 'gemini', 'local', 'disabled')),
      ai_api_key_encrypted text,
      ai_text_model text CHECK (ai_text_model IS NULL OR ai_text_model ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$'),
      ai_image_model text CHECK (ai_image_model IS NULL OR ai_image_model ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$'),
      ai_guidelines text NOT NULL DEFAULT '' CHECK (length(ai_guidelines) <= 4000),
      ai_images boolean NOT NULL DEFAULT true,
      email_enabled boolean NOT NULL DEFAULT false,
      smtp_host text, smtp_port integer CHECK (smtp_port IS NULL OR smtp_port BETWEEN 1 AND 65535), smtp_secure boolean NOT NULL DEFAULT false,
      smtp_user text, smtp_password_encrypted text, smtp_from_email text, smtp_from_name text,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
    )`);
    await runner.query(`INSERT INTO public.settings (singleton, tagline, description, site_theme_id, panel_theme_id) VALUES (true, $1::jsonb, $2::jsonb, $3, $4)`, [
      JSON.stringify({ pt: 'Notícias com contexto, em português e inglês', en: 'News with context, in Portuguese and English' }),
      JSON.stringify({ pt: 'Portal de notícias independente: política, economia, tecnologia, cultura e mundo.', en: 'Independent news portal: politics, economy, technology, culture and world.' }),
      themeIds['meta-news'], themeIds['meta-news-panel'],
    ]);
    await runner.query('CREATE TRIGGER settings_singleton BEFORE DELETE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.keep_singleton()');

    await runner.query(`CREATE TABLE public.legal_documents (
      kind text NOT NULL CHECK (kind IN ('privacy', 'terms')),
      edition text NOT NULL CHECK (edition IN ('pt', 'en')),
      title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
      summary text NOT NULL CHECK (char_length(summary) <= 400),
      content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 100000),
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      PRIMARY KEY (kind, edition)
    )`);

    await runner.query(`CREATE TABLE public.contact_messages (
      id uuid PRIMARY KEY,
      name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
      email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
      topic text NOT NULL CHECK (topic IN (${CONTACT_TOPICS.map((topic) => `'${topic}'`).join(', ')})),
      message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 20000),
      locale text NOT NULL CHECK (locale IN ('pt', 'en')),
      status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
      created_at timestamptz NOT NULL DEFAULT now(),
      read_at timestamptz,
      read_by uuid REFERENCES public.users(id) ON DELETE SET NULL
    )`);
    await runner.query('CREATE INDEX contact_messages_recent_idx ON public.contact_messages (created_at DESC, id)');

    // ---------------------------------------------------------------------------------------------- Taxonomy and media
    await runner.query(`CREATE TABLE public.categories (
      id uuid PRIMARY KEY,
      name jsonb NOT NULL ${i18n('name', 80, true)},
      slug jsonb NOT NULL ${slugs('slug')},
      description jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('description', 300)},
      color text NOT NULL DEFAULT 'blue' CHECK (color ~ '^[a-z]+$'),
      position integer NOT NULL DEFAULT 0,
      active boolean NOT NULL DEFAULT true,
      show_in_menu boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT categories_slugs_present CHECK (slug ? 'pt' AND slug ? 'en')
    )`);
    for (const locale of LOCALES) await runner.query(`CREATE UNIQUE INDEX categories_slug_${locale}_idx ON public.categories ((slug ->> '${locale}'))`);

    await runner.query(`CREATE TABLE public.tags (
      id uuid PRIMARY KEY,
      name jsonb NOT NULL ${i18n('name', 60, true)},
      slug jsonb NOT NULL ${slugs('slug')},
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tags_slugs_present CHECK (slug ? 'pt' AND slug ? 'en')
    )`);
    for (const locale of LOCALES) await runner.query(`CREATE UNIQUE INDEX tags_slug_${locale}_idx ON public.tags ((slug ->> '${locale}'))`);

    // Images of the media library: renditions in the store under `media/<id>/`, never the original upload.
    await runner.query(`CREATE TABLE public.media (
      id uuid PRIMARY KEY,
      source text NOT NULL CHECK (source IN ('upload', 'ai')),
      width integer NOT NULL CHECK (width > 0),
      height integer NOT NULL CHECK (height > 0),
      color text NOT NULL CHECK (color ~ '^#[0-9a-f]{6}$'),
      bytes bigint NOT NULL CHECK (bytes > 0),
      title text NOT NULL DEFAULT '' CHECK (length(title) <= 200),
      alt jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('alt', 300)},
      caption jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('caption', 500)},
      credit text NOT NULL DEFAULT '' CHECK (length(credit) <= 160),
      ai_prompt text CHECK (ai_prompt IS NULL OR length(ai_prompt) <= 4000),
      created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query('CREATE INDEX media_recent_idx ON public.media (created_at DESC, id)');
    await runner.query('CREATE INDEX media_title_trgm_idx ON public.media USING gin (public.pmn_fold(title) gin_trgm_ops)');

    // ---------------------------------------------------------------------------------------------- News
    await runner.query(`CREATE TABLE public.news (
      id uuid PRIMARY KEY,
      status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'archived')),
      title jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('title', 200)},
      subtitle jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('subtitle', 400)},
      -- Canonical article HTML per language (common/rich-text/article-html.ts) and its readable text, for search.
      body jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('body', 400000)},
      body_text jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('body_text', 200000)},
      slug jsonb NOT NULL DEFAULT '{}'::jsonb ${slugs('slug')},
      category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
      cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
      cover_caption jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('cover_caption', 500)},
      author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
      -- The languages the item is published in; each needs its title, body and slug.
      locales text[] NOT NULL DEFAULT '{}' CHECK (locales <@ ${array(LOCALES)}),
      featured boolean NOT NULL DEFAULT false,
      breaking boolean NOT NULL DEFAULT false,
      seo_title jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('seo_title', 70)},
      seo_description jsonb NOT NULL DEFAULT '{}'::jsonb ${i18n('seo_description', 170)},
      -- How the builder keeps the languages in step: { enabled, source }.
      translation jsonb NOT NULL DEFAULT '{"enabled":true,"source":"pt"}'::jsonb CHECK (jsonb_typeof(translation) = 'object'),
      ai_assisted boolean NOT NULL DEFAULT false,
      reading_minutes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(reading_minutes) = 'object'),
      views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
      published_at timestamptz,
      scheduled_at timestamptz,
      created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      search_pt tsvector GENERATED ALWAYS AS (${search('pt')}) STORED,
      search_en tsvector GENERATED ALWAYS AS (${search('en')}) STORED,
      CONSTRAINT news_publication_date CHECK (status NOT IN ('published', 'archived') OR published_at IS NOT NULL),
      CONSTRAINT news_schedule_date CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL),
      CONSTRAINT news_publishable_locales CHECK (status NOT IN ('published', 'scheduled') OR cardinality(locales) > 0)
    )`);
    for (const locale of LOCALES) {
      await runner.query(`CREATE UNIQUE INDEX news_slug_${locale}_idx ON public.news ((slug ->> '${locale}')) WHERE slug ? '${locale}'`);
      await runner.query(`CREATE INDEX news_search_${locale}_idx ON public.news USING gin (search_${locale})`);
    }
    await runner.query('CREATE INDEX news_published_idx ON public.news (published_at DESC, id) WHERE status = \'published\'');
    await runner.query('CREATE INDEX news_status_idx ON public.news (status, updated_at DESC)');
    await runner.query('CREATE INDEX news_category_idx ON public.news (category_id, published_at DESC)');
    await runner.query('CREATE INDEX news_author_idx ON public.news (author_id, published_at DESC)');
    await runner.query('CREATE INDEX news_scheduled_idx ON public.news (scheduled_at) WHERE status = \'scheduled\'');
    await runner.query(`CREATE INDEX news_title_trgm_idx ON public.news USING gin (public.pmn_fold(coalesce(title ->> 'pt', '') || ' ' || coalesce(title ->> 'en', '')) gin_trgm_ops)`);

    await runner.query(`CREATE TABLE public.news_tags (
      news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
      tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
      position integer NOT NULL DEFAULT 0,
      PRIMARY KEY (news_id, tag_id)
    )`);
    await runner.query('CREATE INDEX news_tags_tag_idx ON public.news_tags (tag_id)');

    // A snapshot of the editable content at each save that changed it, so an editor can compare and restore.
    await runner.query(`CREATE TABLE public.news_revisions (
      id uuid PRIMARY KEY,
      news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
      snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
      reason text NOT NULL CHECK (reason IN ('save', 'status', 'restore', 'ai')),
      created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query('CREATE INDEX news_revisions_news_idx ON public.news_revisions (news_id, created_at DESC)');

    // Reads per day, counted without any trace of the reader: the dashboard's charts and "most read".
    await runner.query(`CREATE TABLE public.news_views (
      news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
      day date NOT NULL,
      views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
      PRIMARY KEY (news_id, day)
    )`);
    await runner.query('CREATE INDEX news_views_day_idx ON public.news_views (day)');

    // ---------------------------------------------------------------------------------------------- AI writer
    await runner.query(`CREATE TABLE public.ai_conversations (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      title text NOT NULL DEFAULT '' CHECK (length(title) <= 160),
      news_id uuid REFERENCES public.news(id) ON DELETE SET NULL,
      options jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(options) = 'object'),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_message_at timestamptz
    )`);
    await runner.query('CREATE INDEX ai_conversations_user_idx ON public.ai_conversations (user_id, updated_at DESC)');
    await runner.query(`CREATE TABLE public.ai_messages (
      id uuid PRIMARY KEY,
      conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('user', 'assistant')),
      content text NOT NULL DEFAULT '' CHECK (length(content) <= 60000),
      -- The structured article an answer proposed, ready to become a draft.
      proposal jsonb CHECK (proposal IS NULL OR jsonb_typeof(proposal) = 'object'),
      media_ids uuid[] NOT NULL DEFAULT '{}',
      status text NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'streaming', 'stopped', 'error')),
      error_code text,
      provider text,
      model text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query('CREATE INDEX ai_messages_conversation_idx ON public.ai_messages (conversation_id, created_at)');
  }

  async down(): Promise<void> {
    throw new Error('The baseline is not reversible: restore a backup instead.');
  }
}
