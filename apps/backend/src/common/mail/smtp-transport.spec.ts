import { ConfigService } from '@nestjs/config';
import dns from 'node:dns/promises';
import nodemailer from 'nodemailer';
import {
  createSmtpTransport, isRestrictedAddress, environmentSmtpSettings, resolveSmtpDestination, smtpSender,
  validatePanelSmtp, verifySmtp, type SmtpTransportSettings,
} from './smtp-transport.js';

const platform = {
  NODE_ENV: 'production', SMTP_HOST: 'smtp.example.org', SMTP_PORT: '587', SMTP_SECURE: 'false',
  SMTP_USER: 'operator', SMTP_PASSWORD: 'test-only-password', SMTP_FROM: 'security@example.org',
};
const tenantSmtp: SmtpTransportSettings = {
  source: 'panel', host: 'mail.client.example', port: 587, secure: false,
  user: 'client', password: 'client-secret', from: 'alerts@client.example', fromName: 'Client Ethics',
};

describe('platform SMTP settings', () => {
  it('reads the operator configuration and reports an absent block as unconfigured', () => {
    expect(environmentSmtpSettings(new ConfigService(platform))).toEqual({
      source: 'environment', host: 'smtp.example.org', port: 587, secure: false,
      user: 'operator', password: 'test-only-password', from: 'security@example.org', fromName: undefined,
    });
    expect(environmentSmtpSettings(new ConfigService({}))).toBeNull();
    expect(environmentSmtpSettings(new ConfigService({ SMTP_PORT: '587', SMTP_SECURE: 'false' }))).toBeNull();
    expect(environmentSmtpSettings(new ConfigService({ ...platform, SMTP_PORT: '465' }))).toBeNull();
  });

  it('formats the sender with an optional display name', () => {
    expect(smtpSender(tenantSmtp)).toEqual({ name: 'Client Ethics', address: 'alerts@client.example' });
    expect(smtpSender({ ...tenantSmtp, fromName: undefined })).toBe('alerts@client.example');
  });
});

describe('tenant SMTP validation', () => {
  const valid = { host: 'mail.client.example', port: 587, secure: false, user: 'client', password: 'secret', from: 'alerts@client.example', fromName: 'Client Ethics' };

  it('accepts a complete public relay', () => {
    expect(validatePanelSmtp(valid, true)).toEqual([]);
    expect(validatePanelSmtp({ ...valid, port: 465, secure: true }, true)).toEqual([]);
    expect(validatePanelSmtp({ ...valid, port: 2525 }, true)).toEqual([]);
  });

  it.each([
    [{ port: 8080 }, 'port'], [{ port: 22 }, 'port'], [{ port: 465 }, 'secure'], [{ port: 587, secure: true }, 'secure'],
    [{ host: 'bad host' }, 'host'], [{ host: '-x.example' }, 'host'], [{ host: 'a'.repeat(254) }, 'host'],
    [{ from: 'not-an-address' }, 'from'], [{ fromName: 'Evil\r\nBcc: victim@example.org' }, 'fromName'],
    [{ user: 'client', password: undefined }, 'password'], [{ user: undefined, password: 'secret' }, 'user'],
  ])('rejects %j', (override, field) => {
    expect(validatePanelSmtp({ ...valid, ...override }, true)).toContain(field);
  });

  it.each(['localhost', 'smtp.localhost', 'relay.internal', 'printer.local', '127.0.0.1', '10.0.0.8', '169.254.169.254', '192.168.1.10', '[::1]', '::1'])(
    'refuses the internal destination %s in production', (host) => {
      expect(validatePanelSmtp({ ...valid, host }, true)).toContain('host');
    });

  it('permits local relays such as Mailpit outside production', () => {
    expect(validatePanelSmtp({ ...valid, host: 'localhost', port: 25, user: undefined, password: undefined }, false)).toEqual([]);
  });

  it('requires authentication in production only', () => {
    expect(validatePanelSmtp({ ...valid, user: undefined, password: undefined }, true)).toEqual(expect.arrayContaining(['user', 'password']));
    expect(validatePanelSmtp({ ...valid, user: undefined, password: undefined }, false)).toEqual([]);
  });
});

describe('outbound SMTP destination', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1'])(
    'classifies %s as restricted', (address) => {
      expect(isRestrictedAddress(address)).toBe(true);
    });

  it.each(['203.0.113.10', '8.8.8.8', '2001:4860:4860::8888'])('classifies %s as public', (address) => {
    expect(isRestrictedAddress(address)).toBe(false);
  });

  it('trusts the operator relay and resolves it lazily', async () => {
    const lookup = vi.spyOn(dns, 'lookup');
    await expect(resolveSmtpDestination({ ...tenantSmtp, source: 'environment' }, true)).resolves.toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('pins a tenant relay to its resolved public address to defeat DNS rebinding', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '203.0.113.10', family: 4 }] as never);
    await expect(resolveSmtpDestination(tenantSmtp, true)).resolves.toBe('203.0.113.10');
  });

  it('refuses a tenant relay that resolves to any internal address in production', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '203.0.113.10', family: 4 }, { address: '169.254.169.254', family: 4 }] as never);
    await expect(resolveSmtpDestination(tenantSmtp, true)).rejects.toMatchObject({ code: 'EDESTINATION' });
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);
    await expect(resolveSmtpDestination(tenantSmtp, false)).resolves.toBe('127.0.0.1');
  });

  it('connects to the pinned address while validating the certificate for the configured host', () => {
    const transport = vi.spyOn(nodemailer, 'createTransport').mockReturnValue({} as ReturnType<typeof nodemailer.createTransport>);
    createSmtpTransport(tenantSmtp, true, '203.0.113.10');
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({
      host: '203.0.113.10', port: 587, secure: false, requireTLS: true, tls: { servername: 'mail.client.example' },
      auth: { user: 'client', pass: 'client-secret' }, logger: false, debug: false,
    }));
  });

  it('verifies a relay without sending and always closes the transport', async () => {
    const close = vi.fn();
    const verify = vi.fn().mockRejectedValue(Object.assign(new Error('535 bad credentials for client'), { code: 'EAUTH' }));
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '203.0.113.10', family: 4 }] as never);
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ verify, close } as unknown as ReturnType<typeof nodemailer.createTransport>);
    await expect(verifySmtp(tenantSmtp, true)).rejects.toMatchObject({ code: 'EAUTH' });
    expect(close).toHaveBeenCalledOnce();
  });
});
