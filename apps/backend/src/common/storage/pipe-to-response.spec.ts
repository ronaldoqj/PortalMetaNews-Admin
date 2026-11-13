import { PassThrough, Readable, Writable } from 'node:stream';
import { pipeToResponse } from './pipe-to-response.js';

function destination(): Writable {
  return new Writable({ write: (_chunk, _encoding, done) => done() });
}

describe('pipeToResponse', () => {
  it('streams the source into the response', async () => {
    const chunks: Buffer[] = [];
    const response = new Writable({ write: (chunk, _encoding, done) => { chunks.push(chunk); done(); } });
    pipeToResponse(Readable.from([Buffer.from('ab'), Buffer.from('c')]), response);
    await new Promise((resolve) => response.on('finish', resolve));
    expect(Buffer.concat(chunks).toString()).toBe('abc');
  });

  it('releases the source when the client already left, so a late provider error can not stop the process', async () => {
    const response = destination();
    response.destroy();
    const source = new PassThrough();
    expect(() => pipeToResponse(source, response)).not.toThrow();
    expect(source.destroyed).toBe(true);
    // A checksum validator failing after the abort must find the stream already released.
    source.destroy(new Error('Checksum mismatch'));
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('cuts the response instead of ending it when the source fails midway', async () => {
    const response = destination();
    const source = new PassThrough();
    pipeToResponse(source, response);
    source.write('partial');
    source.destroy(new Error('authentication tag mismatch'));
    await new Promise((resolve) => response.on('close', resolve));
    expect(response.destroyed).toBe(true);
    expect(response.writableFinished).toBe(false);
  });
});
