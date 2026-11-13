import enAdmin from "../../messages/en/admin.json";
import enCommon from "../../messages/en/common.json";
import enNewsroom from "../../messages/en/newsroom.json";
import enPanel from "../../messages/en/panel.json";
import enSite from "../../messages/en/site.json";
import enThemes from "../../messages/en/themes.json";
import enWriter from "../../messages/en/writer.json";
import ptAdmin from "../../messages/pt/admin.json";
import ptCommon from "../../messages/pt/common.json";
import ptNewsroom from "../../messages/pt/newsroom.json";
import ptPanel from "../../messages/pt/panel.json";
import ptSite from "../../messages/pt/site.json";
import ptThemes from "../../messages/pt/themes.json";
import ptWriter from "../../messages/pt/writer.json";

import type { AppLocale } from "./routing";

export type MessageTree = {
  [key: string]: string | MessageTree | ReadonlyArray<string | MessageTree>;
};

/**
 * Each catalog is kept in parts, one file per area under `messages/<locale>/`, so an area's copy is edited in its own
 * file: `common` (shared words), `panel` (shell, navigation, sign-in), `newsroom` (news, builder, sections, tags,
 * media, front page), `writer` (AI writer), `themes` (themes and branding), `admin` (team, settings, audit, messages,
 * documentation) and `site` (the public site). A namespace lives in exactly one part and both languages stay in
 * parity (`messages.test.ts`).
 */
export const MESSAGE_PARTS = {
  pt: { common: ptCommon, panel: ptPanel, newsroom: ptNewsroom, writer: ptWriter, themes: ptThemes, admin: ptAdmin, site: ptSite },
  en: { common: enCommon, panel: enPanel, newsroom: enNewsroom, writer: enWriter, themes: enThemes, admin: enAdmin, site: enSite },
} as const satisfies Record<AppLocale, Record<string, MessageTree>>;

const join = (parts: Record<string, MessageTree>): MessageTree => Object.assign({}, ...Object.values(parts)) as MessageTree;

const catalogs: Record<AppLocale, MessageTree> = { pt: join(MESSAGE_PARTS.pt), en: join(MESSAGE_PARTS.en) };

export const getMessagesForLocale = (locale: AppLocale): MessageTree => catalogs[locale];
