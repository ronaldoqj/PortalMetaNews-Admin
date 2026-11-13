import { z } from "zod";

/** Mirrors the API (`modules/site/contact-messages.service.ts`): what a reader writes about and where a message stands. */
export const CONTACT_TOPICS = ["tip", "correction", "advertising", "press", "privacy", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];
export const CONTACT_STATUSES = ["new", "read", "archived"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const contactMessageSchema = z.object({
  id: z.uuid(), name: z.string(), email: z.string(), topic: z.enum(CONTACT_TOPICS),
  /** Canonical rich text, rendered by `RichTextContent`. */
  message: z.string(), locale: z.string(), status: z.enum(CONTACT_STATUSES),
  createdAt: z.iso.datetime(), readAt: z.iso.datetime().nullable(), readBy: z.string().nullable(),
}).strict();
export type ContactMessage = z.infer<typeof contactMessageSchema>;

export const contactPageSchema = z.object({
  items: z.array(contactMessageSchema), total: z.number().int().nonnegative(), unread: z.number().int().nonnegative(),
  page: z.number().int().positive(), pageSize: z.number().int().positive(),
}).strict();
export type ContactPage = z.infer<typeof contactPageSchema>;

/** The inbox's filters, as the address carries them; anything malformed is dropped rather than refused. */
export const contactFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
  search: z.string().trim().max(120).optional().catch(undefined),
  status: z.enum(CONTACT_STATUSES).optional().catch(undefined),
  topic: z.enum(CONTACT_TOPICS).optional().catch(undefined),
});
export type ContactFilters = z.infer<typeof contactFiltersSchema>;
