import {
  BookOpen, Bot, FileText, FolderTree, Gauge, HardDrive, Image, Inbox, LayoutDashboard, LayoutTemplate, Logs, Mail, Newspaper, Palette,
  Scale, Settings, Sparkles, SwatchBook, Tags, UsersRound, type LucideIcon,
} from "lucide-react";
import type { AppRoute } from "../../i18n/routing";
import type { Permission } from "../admin/permissions";

/**
 * The panel's menu and breadcrumbs, as data: one place says what the panel offers, to whom, and where each page sits.
 * The shell draws both from here; labels are catalog keys, always literal.
 */

/** A page without a parameter in its address: the only kind a menu entry or a breadcrumb step can link to. */
export type StaticRoute = Exclude<AppRoute, `${string}[${string}]${string}`>;

export type NavEntry = {
  label: string;
  icon: LucideIcon;
  href?: StaticRoute;
  /** The routes that light the entry up, besides `href`. */
  also?: readonly AppRoute[];
  /** Holding any of these shows the entry (none named: every account). */
  permissions?: readonly Permission[];
  /** A counter of the menu (`panel/badges`). */
  badge?: "review" | "messages";
  children?: ReadonlyArray<NavEntry>;
};
export type NavSection = { label: string; entries: ReadonlyArray<NavEntry> };

/** The newsroom's work first, then what the site shows, then the panel's own administration. */
export const PANEL_NAVIGATION: ReadonlyArray<NavSection> = [
  { label: "Navigation.sections.newsroom", entries: [
    { label: "Navigation.dashboard", icon: LayoutDashboard, href: "/panel/dashboard", permissions: ["news:read"] },
    { label: "Navigation.news", icon: Newspaper, href: "/panel/news", also: ["/panel/news/new", "/panel/news/[id]"], permissions: ["news:read"], badge: "review" },
    { label: "Navigation.aiWriter", icon: Sparkles, href: "/panel/ai-writer", also: ["/panel/ai-writer/[id]"], permissions: ["ai:use"] },
    { label: "Navigation.frontPage", icon: LayoutTemplate, href: "/panel/front-page", permissions: ["front_page:manage"] },
    { label: "Navigation.media", icon: Image, href: "/panel/media", permissions: ["media:manage", "news:read"] },
    { label: "Navigation.categories", icon: FolderTree, href: "/panel/categories", permissions: ["taxonomy:manage"] },
    { label: "Navigation.tags", icon: Tags, href: "/panel/tags", permissions: ["taxonomy:manage"] },
  ] },
  { label: "Navigation.sections.site", entries: [
    { label: "Navigation.themes", icon: SwatchBook, href: "/panel/themes", also: ["/panel/themes/[id]"], permissions: ["themes:manage"] },
    { label: "Navigation.branding", icon: Palette, href: "/panel/branding", permissions: ["themes:manage"] },
    { label: "Navigation.siteSettings", icon: Gauge, href: "/panel/settings/site", permissions: ["site:manage"] },
    { label: "Navigation.legal", icon: Scale, permissions: ["site:manage"], children: [
      { label: "Navigation.privacy", icon: FileText, href: "/panel/site/privacy", permissions: ["site:manage"] },
      { label: "Navigation.terms", icon: FileText, href: "/panel/site/terms", permissions: ["site:manage"] },
    ] },
    { label: "Navigation.contacts", icon: Inbox, href: "/panel/contacts", also: ["/panel/contacts/[id]"], permissions: ["contacts:read"], badge: "messages" },
  ] },
  { label: "Navigation.sections.administration", entries: [
    { label: "Navigation.access", icon: UsersRound, href: "/panel/access", permissions: ["users:manage"] },
    { label: "Navigation.settings", icon: Settings, also: ["/panel/settings"], permissions: ["settings:manage"], children: [
      { label: "Navigation.ai", icon: Bot, href: "/panel/settings/ai", permissions: ["settings:manage"] },
      { label: "Navigation.email", icon: Mail, href: "/panel/settings/email", permissions: ["settings:manage"] },
      { label: "Navigation.storage", icon: HardDrive, href: "/panel/settings/storage", permissions: ["settings:manage"] },
    ] },
    { label: "Navigation.audit", icon: Logs, href: "/panel/audit", permissions: ["audit:read"] },
    { label: "Navigation.documentation", icon: BookOpen, href: "/panel/documentation", also: ["/panel/documentation/[id]"], permissions: ["documentation:read"] },
  ] },
];

type Crumb = { label: string; href?: StaticRoute };

/** Where each page sits, after "Início" (the dashboard): its trail of breadcrumbs. */
export const TRAILS: Partial<Record<AppRoute, readonly Crumb[]>> = {
  "/panel/news": [{ label: "Navigation.news" }],
  "/panel/news/new": [{ label: "Navigation.news", href: "/panel/news" }, { label: "Navigation.newNews" }],
  "/panel/news/[id]": [{ label: "Navigation.news", href: "/panel/news" }, { label: "Breadcrumbs.editNews" }],
  "/panel/ai-writer": [{ label: "Navigation.aiWriter" }],
  "/panel/ai-writer/[id]": [{ label: "Navigation.aiWriter", href: "/panel/ai-writer" }, { label: "Breadcrumbs.conversation" }],
  "/panel/front-page": [{ label: "Navigation.frontPage" }],
  "/panel/categories": [{ label: "Navigation.categories" }],
  "/panel/tags": [{ label: "Navigation.tags" }],
  "/panel/media": [{ label: "Navigation.media" }],
  "/panel/themes": [{ label: "Navigation.themes" }],
  "/panel/themes/[id]": [{ label: "Navigation.themes", href: "/panel/themes" }, { label: "Breadcrumbs.theme" }],
  "/panel/branding": [{ label: "Navigation.branding" }],
  "/panel/settings/site": [{ label: "Navigation.siteSettings" }],
  "/panel/site/privacy": [{ label: "Navigation.legal" }, { label: "Navigation.privacy" }],
  "/panel/site/terms": [{ label: "Navigation.legal" }, { label: "Navigation.terms" }],
  "/panel/contacts": [{ label: "Navigation.contacts" }],
  "/panel/contacts/[id]": [{ label: "Navigation.contacts", href: "/panel/contacts" }, { label: "Breadcrumbs.message" }],
  "/panel/access": [{ label: "Navigation.access" }],
  "/panel/settings": [{ label: "Navigation.settings" }],
  "/panel/settings/ai": [{ label: "Navigation.settings", href: "/panel/settings" }, { label: "Navigation.ai" }],
  "/panel/settings/email": [{ label: "Navigation.settings", href: "/panel/settings" }, { label: "Navigation.email" }],
  "/panel/settings/storage": [{ label: "Navigation.settings", href: "/panel/settings" }, { label: "Navigation.storage" }],
  "/panel/audit": [{ label: "Navigation.audit" }],
  "/panel/documentation": [{ label: "Navigation.documentation" }],
  "/panel/documentation/[id]": [{ label: "Navigation.documentation", href: "/panel/documentation" }, { label: "Breadcrumbs.document" }],
  "/panel/profile": [{ label: "Navigation.profile" }],
};

/** Whether the account may open an entry: the entry itself, or any of the pages grouped under it. */
export function visibleEntry(entry: NavEntry, held: readonly Permission[]): boolean {
  if (entry.permissions && !entry.permissions.some((permission) => held.includes(permission))) return false;
  return !entry.children || entry.children.some((child) => visibleEntry(child, held));
}

/** Whether `route` belongs to the entry (its own page, the pages named with it, or a page grouped under it). */
export function activeEntry(entry: NavEntry, route: AppRoute | undefined): boolean {
  if (!route) return false;
  return entry.href === route || !!entry.also?.includes(route) || !!entry.children?.some((child) => activeEntry(child, route));
}
