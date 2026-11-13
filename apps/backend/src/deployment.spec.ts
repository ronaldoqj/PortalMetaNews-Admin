import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './config/environment.validation.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const nvmrc = read('../../../.nvmrc').trim();
const backend = { dockerfile: read('../Dockerfile'), scripts: (JSON.parse(read('../package.json')) as { scripts: Record<string, string> }).scripts };
const frontend = read('../../frontend/Dockerfile');

describe.each([['backend', backend.dockerfile], ['frontend', frontend]])('%s image', (_name, dockerfile) => {
  it('pins the repository Node version in every stage, runs as node under tini, with a health check', () => {
    const stages = [...dockerfile.matchAll(/^FROM node:(\S+?)-alpine\b/gm)].map((match) => match[1]);
    expect(stages.length).toBeGreaterThan(1);
    expect(new Set(stages)).toEqual(new Set([nvmrc]));
    expect(dockerfile).toMatch(/^USER node$/m);
    expect(dockerfile).toContain('tini');
    expect(dockerfile).toMatch(/^HEALTHCHECK /m);
    expect(dockerfile).toContain('--omit=dev');
  });

  it('takes no setting or secret as a build argument', () => {
    expect(dockerfile).not.toMatch(/^ARG /m);
  });
});

describe('backend image', () => {
  it('starts exactly as npm run start:prod and checks /health', () => {
    expect(/^CMD \["sh", "-c", "(.+)"\]$/m.exec(backend.dockerfile)?.[1]).toBe(backend.scripts['start:prod']);
    expect(backend.dockerfile).toContain('/health');
  });

  it('keeps settings and tests out of the build context', () => {
    const ignore = read('../.dockerignore');
    expect(ignore).toMatch(/^\*$/m);
    expect(ignore).toContain('**/*.spec.ts');
    expect(ignore).not.toMatch(/^!\.env/m);
    expect(read('../nixpacks.toml')).toContain('npm run start:prod');
  });
});

describe('frontend image', () => {
  it('builds with next, ships the documentation content and starts next', () => {
    expect(frontend).toContain('npm run build');
    expect(frontend).toMatch(/COPY (--from=build \/app\/)?content/);
    expect(frontend).toContain('next/dist/bin/next", "start"');
    expect(frontend).toContain('/api/health');
  });
});

describe('.env.example', () => {
  const settings = Object.fromEntries(read('../.env.example').split('\n').filter((line) => /^[A-Z_0-9]+=/.test(line)).map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  const documented = new Set(read('../.env.example').match(/^#? ?[A-Z][A-Z_0-9]+=/gm)?.map((line) => line.replace(/^# ?|=$/g, '')));

  it('documents every variable the API validates', () => {
    const validation = read('./config/environment.validation.ts');
    const names = [...validation.matchAll(/^  ([A-Z][A-Z_0-9]+)[!?]?(?::| =)/gm)].map((match) => match[1]);
    expect(names.length).toBeGreaterThan(15);
    expect(names.filter((name) => name !== 'NODE_ENV' && !documented.has(name))).toEqual([]);
  });

  it('is a valid configuration once the secrets are filled in', () => {
    expect(() => validateEnvironment({ ...settings, APP_SECRET_KEY: 'a'.repeat(64) })).not.toThrow();
  });
});
