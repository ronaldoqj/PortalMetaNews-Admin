import type { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import dns from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import nodemailer from 'nodemailer';

/** A resolved relay: the operator's (environment) or the one saved in the panel (stored, password decrypted). */
export interface SmtpTransportSettings {
  source: 'environment' | 'panel';
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  fromName?: string;
}

export interface PanelSmtpInput {
  host?: unknown;
  port?: unknown;
  secure?: unknown;
  user?: unknown;
  password?: unknown;
  from?: unknown;
  fromName?: unknown;
}

/** Frequent alternative spellings; naming the expected key turns a silent misconfiguration into a clear error. */
export const ALTERNATIVE_KEYS: Readonly<Record<string, string>> = { SMTP_PASS: 'SMTP_PASSWORD', SMTP_FROM_EMAIL: 'SMTP_FROM' };
/** Implicit TLS (465) and STARTTLS/plain ports (587, 25, 2525) cannot be mixed: the handshake only times out at delivery. */
const PORT_SECURITY: Readonly<Record<number, boolean>> = { 465: true, 587: false, 25: false, 2525: false };
/** Ports a panel relay may use; anything else would turn the relay settings into an internal port scanner. */
export const PANEL_SMTP_PORTS = [25, 465, 587, 2525] as const;
const HOSTNAME = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
const DISPLAY_NAME = /^[\p{L}\p{N} .,'&()-]{1,100}$/u;
/** Names that only resolve inside a private network or the host itself. */
const INTERNAL_NAMES = /(?:^|\.)(?:localhost|local|internal|localdomain|home\.arpa)$/i;

function present(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

const RESTRICTED = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) RESTRICTED.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) RESTRICTED.addSubnet(network, prefix, 'ipv6');

/** Loopback, private, link-local (cloud metadata), carrier-grade NAT, documentation, multicast and reserved ranges. */
export function isRestrictedAddress(address: string): boolean {
  const literal = address.replace(/^\[|\]$/g, '');
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(literal)?.[1];
  if (mapped) return isRestrictedAddress(mapped);
  const family = isIP(literal);
  if (family === 4) return RESTRICTED.check(literal, 'ipv4');
  if (family === 6) return RESTRICTED.check(literal, 'ipv6');
  return true;
}

/** Key names of an invalid operator SMTP block. An entirely absent relay is valid: e-mail is then unavailable. */
export function invalidEnvironmentSmtpKeys(configuration: Record<string, unknown>): string[] {
  const invalid = new Set<string>(Object.keys(ALTERNATIVE_KEYS).filter((key) => present(configuration[key]))
    .map((key) => `${key} (use ${ALTERNATIVE_KEYS[key]})`));
  // Port and TLS mode have example defaults, so they alone never count as a configured relay.
  if (!['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'SMTP_FROM_NAME'].some((key) => present(configuration[key]))) return [...invalid];
  if (typeof configuration.SMTP_HOST !== 'string' || !HOSTNAME.test(configuration.SMTP_HOST)) invalid.add('SMTP_HOST');
  const port = Number(configuration.SMTP_PORT);
  if (!present(configuration.SMTP_PORT) || !Number.isInteger(port) || port < 1 || port > 65535) invalid.add('SMTP_PORT');
  if (!['true', 'false'].includes(String(configuration.SMTP_SECURE))) invalid.add('SMTP_SECURE');
  if (port in PORT_SECURITY && String(configuration.SMTP_SECURE) !== String(PORT_SECURITY[port])) invalid.add('SMTP_SECURE');
  if (typeof configuration.SMTP_FROM !== 'string' || !isEmail(configuration.SMTP_FROM)) invalid.add('SMTP_FROM');
  if (present(configuration.SMTP_FROM_NAME) && (typeof configuration.SMTP_FROM_NAME !== 'string' || !DISPLAY_NAME.test(configuration.SMTP_FROM_NAME))) {
    invalid.add('SMTP_FROM_NAME');
  }
  if (!!configuration.SMTP_USER !== !!configuration.SMTP_PASSWORD) {
    invalid.add('SMTP_USER'); invalid.add('SMTP_PASSWORD');
  }
  if (configuration.NODE_ENV === 'production' && (!configuration.SMTP_USER || !configuration.SMTP_PASSWORD)) {
    invalid.add('SMTP_USER'); invalid.add('SMTP_PASSWORD');
  }
  return [...invalid];
}

/** The operator relay from validated configuration, or null when none is (validly) configured. */
export function environmentSmtpSettings(config: ConfigService): SmtpTransportSettings | null {
  const values: Record<string, unknown> = Object.fromEntries(
    ['NODE_ENV', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'SMTP_FROM_NAME', ...Object.keys(ALTERNATIVE_KEYS)]
      .map((key) => [key, config.get<string>(key)]),
  );
  if (!present(values.SMTP_HOST) || invalidEnvironmentSmtpKeys(values).length) return null;
  return {
    source: 'environment',
    host: String(values.SMTP_HOST),
    port: Number(values.SMTP_PORT),
    secure: values.SMTP_SECURE === 'true',
    user: present(values.SMTP_USER) ? String(values.SMTP_USER) : undefined,
    password: present(values.SMTP_PASSWORD) ? String(values.SMTP_PASSWORD) : undefined,
    from: String(values.SMTP_FROM),
    fromName: present(values.SMTP_FROM_NAME) ? String(values.SMTP_FROM_NAME) : undefined,
  };
}

/**
 * Field names of an invalid panel relay. In production the host must be a public name or address:
 * a panel relay is an outbound destination, so internal and metadata endpoints are refused here
 * and again, after DNS resolution, at connection time.
 */
export function validatePanelSmtp(input: PanelSmtpInput, production: boolean): string[] {
  const invalid = new Set<string>();
  const host = typeof input.host === 'string' ? input.host.replace(/^\[|\]$/g, '') : '';
  if (isIP(host)) {
    if (production && isRestrictedAddress(host)) invalid.add('host');
  } else if (!host || host.length > 253 || !HOSTNAME.test(host) || host.split('.').some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) {
    invalid.add('host');
  } else if (production && INTERNAL_NAMES.test(host)) {
    invalid.add('host');
  }
  if (typeof input.port !== 'number' || !(PANEL_SMTP_PORTS as readonly number[]).includes(input.port)) invalid.add('port');
  if (typeof input.secure !== 'boolean' || (typeof input.port === 'number' && input.port in PORT_SECURITY && PORT_SECURITY[input.port] !== input.secure)) invalid.add('secure');
  if (typeof input.from !== 'string' || input.from.length > 254 || !isEmail(input.from)) invalid.add('from');
  if (present(input.fromName) && (typeof input.fromName !== 'string' || !DISPLAY_NAME.test(input.fromName))) invalid.add('fromName');
  const user = present(input.user);
  const password = present(input.password);
  if (user && (typeof input.user !== 'string' || input.user.length > 254 || /[\r\n]/.test(input.user))) invalid.add('user');
  if (password && (typeof input.password !== 'string' || input.password.length > 256)) invalid.add('password');
  if (user && !password) invalid.add('password');
  if (!user && password) invalid.add('user');
  if (production && (!user || !password)) {
    invalid.add('user'); invalid.add('password');
  }
  return [...invalid];
}

function destinationError(code: 'EDNS' | 'EDESTINATION'): Error {
  return Object.assign(new Error('SMTP destination refused'), { code });
}

/**
 * Resolves a panel relay once and returns the address to connect to, so a DNS answer cannot change
 * between validation and connection (rebinding). The operator relay is trusted configuration.
 */
export async function resolveSmtpDestination(settings: SmtpTransportSettings, production: boolean): Promise<string | undefined> {
  if (settings.source === 'environment') return undefined;
  const literal = settings.host.replace(/^\[|\]$/g, '');
  let addresses: Array<{ address: string }>;
  try {
    addresses = isIP(literal) ? [{ address: literal }] : await dns.lookup(literal, { all: true, verbatim: true });
  } catch {
    throw destinationError('EDNS');
  }
  if (!addresses.length) throw destinationError('EDNS');
  if (production && addresses.some(({ address }) => isRestrictedAddress(address))) throw destinationError('EDESTINATION');
  return addresses[0].address;
}

/** Single-use SMTP transport: TLS required in production, bounded timeouts, protocol logging disabled. */
export function createSmtpTransport(settings: SmtpTransportSettings, production: boolean, address?: string) {
  return nodemailer.createTransport({
    host: address ?? settings.host,
    port: settings.port,
    secure: settings.secure,
    requireTLS: production,
    // Connecting to a pinned address still validates the certificate against the configured name.
    ...(address ? { tls: { servername: settings.host } } : {}),
    auth: settings.user ? { user: settings.user, pass: settings.password ?? '' } : undefined,
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    logger: false, debug: false,
  });
}

/** Opens a pinned transport, runs the operation and always closes the connection. */
export async function withSmtpTransport<Result>(
  settings: SmtpTransportSettings, production: boolean,
  operation: (transporter: ReturnType<typeof createSmtpTransport>) => Promise<Result>,
): Promise<Result> {
  const transporter = createSmtpTransport(settings, production, await resolveSmtpDestination(settings, production));
  try {
    return await operation(transporter);
  } finally {
    transporter.close();
  }
}

/** Connects and authenticates without sending any message. */
export async function verifySmtp(settings: SmtpTransportSettings, production: boolean): Promise<void> {
  await withSmtpTransport(settings, production, async (transporter) => { await transporter.verify(); });
}

export function smtpSender(settings: SmtpTransportSettings): string | { name: string; address: string } {
  return settings.fromName ? { name: settings.fromName, address: settings.from } : settings.from;
}

/** Non-identifying failure label for logs: the transport error code only, never addresses, tokens or server replies. */
export function deliveryFailureCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[A-Z_]{2,32}$/.test(code) ? code : 'UNKNOWN';
}
