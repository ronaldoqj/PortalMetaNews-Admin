import type { ContentLocale } from '../../common/i18n/locales.js';

/** The site's legal documents. */
export const LEGAL_KINDS = ['privacy', 'terms'] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];

/** One edition per language of the portal. */
export const LEGAL_EDITIONS = ['pt', 'en'] as const satisfies readonly ContentLocale[];
export type LegalEdition = (typeof LEGAL_EDITIONS)[number];

export interface LegalEditionText { title: string; summary: string; content: string }

export const LEGAL_LIMITS = { title: 160, summary: 400, content: 100_000 } as const;

/** A stable identifier per document and edition, for the audit trail across edits and restores. */
export const LEGAL_DOCUMENT_IDS: Record<LegalKind, Record<LegalEdition, string>> = {
  privacy: { pt: '2d332403-01f4-4c1e-882d-d5cddc4ca647', en: '4b88ebec-c6e0-4e5a-ba70-982cc2e382ae' },
  terms: { pt: '8e49dc58-9c24-492c-9f15-280b13e78a39', en: 'd09dea08-e1b3-4859-994a-b445cee0f946' },
};
