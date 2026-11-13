import { describe, expect, it } from 'vitest';
import { API_ROBOTS, RobotsController } from './robots.controller.js';

describe('RobotsController', () => {
  it('closes the whole API host to crawlers', () => {
    expect(new RobotsController().robots()).toBe(API_ROBOTS);
    expect(API_ROBOTS).toBe('User-agent: *\nDisallow: /\n');
  });
});
