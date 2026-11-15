import { randomUUID } from 'node:crypto';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The newsroom's editorial styles for the AI: several named sets of instructions instead of one text, at most one of
 * them the default. The single style guide kept until now (`settings.ai_guidelines`) becomes the first style, the
 * default, so nothing the newsroom wrote is lost.
 */
export class AiStyles1900000000002 implements MigrationInterface {
  name = 'AiStyles1900000000002';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE public.ai_styles (
      id uuid PRIMARY KEY,
      name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
      instructions text NOT NULL CHECK (length(btrim(instructions)) BETWEEN 1 AND 4000),
      is_default boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
    )`);
    await runner.query('CREATE UNIQUE INDEX ai_styles_name_idx ON public.ai_styles (lower(name))');
    // At most one default: the index refuses a second row with is_default.
    await runner.query('CREATE UNIQUE INDEX ai_styles_default_idx ON public.ai_styles (is_default) WHERE is_default');
    await runner.query(`INSERT INTO public.ai_styles (id, name, instructions, is_default)
      SELECT $1, 'Estilo da redação', btrim(ai_guidelines), true FROM public.settings WHERE singleton AND btrim(ai_guidelines) <> ''`, [randomUUID()]);
    await runner.query('ALTER TABLE public.settings DROP COLUMN ai_guidelines');
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE public.settings ADD COLUMN ai_guidelines text NOT NULL DEFAULT '' CHECK (length(ai_guidelines) <= 4000)`);
    await runner.query(`UPDATE public.settings SET ai_guidelines = coalesce((SELECT instructions FROM public.ai_styles WHERE is_default), '') WHERE singleton`);
    await runner.query('DROP TABLE public.ai_styles');
  }
}
