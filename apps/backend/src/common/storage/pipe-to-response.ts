import { pipeline, type Readable, type Writable } from 'node:stream';

/**
 * Streams an object read from the bucket into an HTTP response. A failure on either side destroys
 * the response (never ends it), so a broken file always arrives truncated.
 *
 * When the client left before the first byte, `pipeline` refuses the destroyed response and the
 * provider stream would stay open with no listener: once R2 closes it, the SDK checksum validator
 * emits an error that nothing handles and the whole API stops. The source is released instead.
 */
export function pipeToResponse(source: Readable, response: Writable): void {
  if (response.destroyed) {
    source.destroy();
    return;
  }
  pipeline(source, response, (error) => {
    if (error) response.destroy();
  });
}
