import { ConsoleLogger } from '@nestjs/common';

/** Nest announcing its own wiring on every start: each module, controller and route, hundreds of lines per deploy. */
const WIRING_CONTEXTS = new Set(['InstanceLoader', 'RoutesResolver', 'RouterExplorer']);

/**
 * The API's logger: Nest's console logger without its wiring announcements, and coloured only on a terminal, so a
 * container's logs (Dokploy, `docker service logs`) carry no ANSI escape codes. Warnings and errors are untouched.
 */
export class AppLogger extends ConsoleLogger {
  constructor() {
    super({ colors: process.stdout.isTTY === true });
  }

  override log(message: unknown, ...rest: unknown[]): void {
    const context = rest.at(-1);
    if (typeof context === 'string' && WIRING_CONTEXTS.has(context)) return;
    super.log(message, ...rest);
  }
}
