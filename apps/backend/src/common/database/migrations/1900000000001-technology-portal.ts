import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Portal Meta News covers technology: the default tagline and description say so. Only an installation that still
 * shows the baseline's general-news defaults is updated; text the newsroom has edited in the panel is left alone.
 */

const GENERAL = {
  tagline: { pt: 'Notícias com contexto, em português e inglês', en: 'News with context, in Portuguese and English' },
  description: {
    pt: 'Portal de notícias independente: política, economia, tecnologia, cultura e mundo.',
    en: 'Independent news portal: politics, economy, technology, culture and world.',
  },
};
const TECHNOLOGY = {
  tagline: { pt: 'Tecnologia com contexto, em português e inglês', en: 'Technology with context, in Portuguese and English' },
  description: {
    pt: 'Portal independente de notícias de tecnologia: inteligência artificial, dispositivos, segurança digital, startups, ciência e games.',
    en: 'Independent technology news portal: artificial intelligence, devices, cybersecurity, startups, science and gaming.',
  },
};

export class TechnologyPortal1900000000001 implements MigrationInterface {
  name = 'TechnologyPortal1900000000001';

  async up(runner: QueryRunner): Promise<void> {
    await this.replace(runner, GENERAL, TECHNOLOGY);
  }

  async down(runner: QueryRunner): Promise<void> {
    await this.replace(runner, TECHNOLOGY, GENERAL);
  }

  private async replace(runner: QueryRunner, from: typeof GENERAL, to: typeof GENERAL): Promise<void> {
    await runner.query(`UPDATE public.settings SET tagline = $2::jsonb WHERE singleton AND tagline = $1::jsonb`, [JSON.stringify(from.tagline), JSON.stringify(to.tagline)]);
    await runner.query(`UPDATE public.settings SET description = $2::jsonb WHERE singleton AND description = $1::jsonb`, [JSON.stringify(from.description), JSON.stringify(to.description)]);
  }
}
