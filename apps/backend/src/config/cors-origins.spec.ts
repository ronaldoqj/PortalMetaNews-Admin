import { corsOrigins } from './cors-origins.js';

describe('development CORS origins', () => {
  it('allows the two explicit local hosts at each configured frontend port', () => {
    const result = corsOrigins('http://localhost:3027,http://localhost:3200', 'development');
    expect(result).toHaveLength(4);
    expect(result).toContain('http://painel.localhost:3200');
    expect(result).toContain('http://localhost:3027');
    expect(result).not.toContain('http://attacker.localhost:3027');
  });
  it('does not widen production origins', () => {
    expect(corsOrigins('https://metanews.com.br', 'production')).toEqual(['https://metanews.com.br']);
  });
  it.each(['*', 'https://example.org/path', 'http://user:password@localhost:3000', 'null'])('rejects unsafe origin %s', (origin) => {
    expect(() => corsOrigins(origin, 'development')).toThrow();
  });
  it.each(['https://*.metanews.com.br', 'http://*.localhost:3027'])('rejects the wildcard in %s, which would never match an origin', (origins) => {
    expect(() => corsOrigins(origins, 'production')).toThrow('wildcards are not allowed');
    expect(() => corsOrigins(origins, 'development')).toThrow('wildcards are not allowed');
  });
});
