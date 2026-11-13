import { describe, expect, it } from 'vitest';
import { SEED_ARTICLES, SEED_CATEGORIES, SEED_FRONT_PAGE_SECTIONS } from './seed-demo-content.js';
import { commonsCredit } from './seed-photos.js';

describe('demo seed content', () => {
  const sections = new Set(SEED_CATEGORIES.map((category) => category.name.pt));

  it('files every story under one of its sections, and the front page shows sections that exist', () => {
    expect(SEED_ARTICLES.every((article) => sections.has(article.category))).toBe(true);
    expect(SEED_FRONT_PAGE_SECTIONS.every((name) => sections.has(name))).toBe(true);
    // Every section has something to show.
    expect([...sections].every((name) => SEED_ARTICLES.some((article) => article.category === name))).toBe(true);
  });

  it('writes both languages, except the story published in Portuguese only', () => {
    for (const article of SEED_ARTICLES) {
      expect(article.pt.title && article.pt.subtitle && article.pt.body.length).toBeTruthy();
      if (!article.ptOnly) expect(article.en.title && article.en.subtitle && article.en.body.length).toBeTruthy();
      expect(article.caption.pt && article.caption.en).toBeTruthy();
    }
  });

  it('illustrates each story with a distinct, openly licensed photograph credited to its author', () => {
    const files = SEED_ARTICLES.map((article) => article.photo.file);
    expect(new Set(files).size).toBe(files.length);
    for (const { photo } of SEED_ARTICLES) {
      expect(photo.license).toMatch(/^(Public domain|CC0|CC BY(-SA)? [0-9.]+)$/);
      expect(photo.author).toBeTruthy();
      expect(commonsCredit(photo)).toContain(photo.author);
      expect(commonsCredit(photo).length).toBeLessThanOrEqual(160);
    }
  });
});
