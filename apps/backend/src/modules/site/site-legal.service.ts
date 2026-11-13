import { Inject, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { requirePermission, type Actor } from '../../common/access/permissions.js';
import { audit } from '../../common/audit/audit.js';
import { PRIVACY_DEFAULTS } from './legal-defaults/privacy.js';
import { TERMS_DEFAULTS } from './legal-defaults/terms.js';
import { LEGAL_DOCUMENT_IDS, LEGAL_EDITIONS, LEGAL_KINDS, type LegalEdition, type LegalEditionText, type LegalKind } from './site-legal.js';

const DEFAULTS: Record<LegalKind, Record<LegalEdition, LegalEditionText>> = { privacy: PRIVACY_DEFAULTS, terms: TERMS_DEFAULTS };

interface StoredDocument { title: string; summary: string; content: string; updated_at: Date; updated_by_name: string | null }

/**
 * The site's privacy policy and terms of use. Each edition is the panel's own text when it has one, else the default
 * shipped with the code, which an edit replaces and a restore brings back. Only `site:manage` changes them; every
 * change is audited without copying the text.
 */
@Injectable()
export class SiteLegalService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  async published(kind: LegalKind, edition: LegalEdition) {
    return { kind, edition, ...(await this.current(this.database.manager, kind, edition)) };
  }

  async overview(actor: Actor) {
    requirePermission(actor, 'site:manage');
    const documents = [];
    for (const kind of LEGAL_KINDS) for (const edition of LEGAL_EDITIONS) {
      const { title, isDefault, updatedAt, updatedBy } = await this.current(this.database.manager, kind, edition);
      documents.push({ kind, edition, title, isDefault, updatedAt, updatedBy });
    }
    return { documents };
  }

  async edition(actor: Actor, kind: LegalKind, edition: LegalEdition) {
    requirePermission(actor, 'site:manage');
    return { kind, edition, ...(await this.current(this.database.manager, kind, edition)), defaults: DEFAULTS[kind][edition] };
  }

  async save(actor: Actor, kind: LegalKind, edition: LegalEdition, text: LegalEditionText) {
    requirePermission(actor, 'site:manage');
    return this.database.transaction(async (manager) => {
      await manager.query(`INSERT INTO public.legal_documents (kind, edition, title, summary, content, updated_at, updated_by)
        VALUES ($1, $2, $3, $4, $5, now(), $6)
        ON CONFLICT (kind, edition) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, content = EXCLUDED.content,
          updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [kind, edition, text.title.trim(), text.summary.trim(), text.content.replace(/\r\n/g, '\n').trim(), actor.userId]);
      await audit(manager, { actorId: actor.userId, action: 'site.legal_updated', resourceType: 'legal_document', resourceId: LEGAL_DOCUMENT_IDS[kind][edition], metadata: { kind, edition } });
      return { kind, edition, ...(await this.current(manager, kind, edition)), defaults: DEFAULTS[kind][edition] };
    });
  }

  async restore(actor: Actor, kind: LegalKind, edition: LegalEdition) {
    requirePermission(actor, 'site:manage');
    return this.database.transaction(async (manager) => {
      const [, removed]: [unknown, number] = await manager.query('DELETE FROM public.legal_documents WHERE kind = $1 AND edition = $2', [kind, edition]);
      if (removed) await audit(manager, { actorId: actor.userId, action: 'site.legal_restored', resourceType: 'legal_document', resourceId: LEGAL_DOCUMENT_IDS[kind][edition], metadata: { kind, edition } });
      return { kind, edition, ...(await this.current(manager, kind, edition)), defaults: DEFAULTS[kind][edition] };
    });
  }

  private async current(manager: EntityManager, kind: LegalKind, edition: LegalEdition) {
    const [row]: StoredDocument[] = await manager.query(`SELECT d.title, d.summary, d.content, d.updated_at,
        COALESCE(NULLIF(btrim(u.name), ''), u.email) AS updated_by_name
      FROM public.legal_documents d LEFT JOIN public.users u ON u.id = d.updated_by WHERE d.kind = $1 AND d.edition = $2`, [kind, edition]);
    if (!row) return { ...DEFAULTS[kind][edition], isDefault: true, updatedAt: null, updatedBy: null };
    return { title: row.title, summary: row.summary, content: row.content, isDefault: false, updatedAt: row.updated_at.toISOString(), updatedBy: row.updated_by_name };
  }
}
