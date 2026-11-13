import { describe, expect, it } from 'vitest';
import { classifyFile, extractFileExtension, isInlineType, storedFileName, titleFromFileName } from './file-types.js';

const bytes = (...values: number[]) => Uint8Array.from(values);
const text = (value: string) => new TextEncoder().encode(value);

describe('file types', () => {
  it.each([
    ['PDF by content, whatever the name', text('%PDF-1.7 ...'), 'contrato.txt', 'application/pdf'],
    ['PNG by content', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'a.dat', 'image/png'],
    ['plain text', text('olá mundo'), 'nota.txt', 'text/plain'],
  ])('detects %s', (_name, head, filename, mime) => {
    expect(classifyFile(head, filename).mimeType).toContain(mime);
  });

  it.each([
    ['a Windows executable', text('MZ\u0090\u0000'), 'foto.png'],
    ['an ELF binary', bytes(0x7f, 0x45, 0x4c, 0x46), 'doc.pdf'],
    ['a script', text('#!/bin/sh\n'), 'doc.txt'],
    ['a refused extension', text('texto'), 'run.exe'],
  ])('refuses %s with 415', (_name, head, filename) => {
    expect(() => classifyFile(head, filename)).toThrow(expect.objectContaining({ status: 415 }));
  });

  it('stores unknown binaries as opaque downloads, never inline', () => {
    const type = classifyFile(bytes(0x00, 0x01, 0x02, 0xff), 'dados.xyz');
    expect(type.mimeType).toBe('application/octet-stream');
    expect(isInlineType(type.mimeType)).toBe(false);
  });

  it.each([
    ['a/b\\c/Relatório.PDF', 'pdf'], ['sem-extensao', undefined], ['.oculto', undefined], ['x.tar.GZ', 'gz'], ['x.' + 'a'.repeat(20), undefined],
  ])('extracts the extension of %s', (name, extension) => {
    expect(extractFileExtension(name)).toBe(extension);
  });

  it('keeps only a clean base name, with the detected extension', () => {
    expect(storedFileName('../../etc/pass\u0000wd.txt', 'pdf')).toBe('passwd.pdf');
    expect(storedFileName(undefined, 'txt')).toBe('documento.txt');
    expect(storedFileName(`${'a'.repeat(400)}.txt`, 'txt')).toHaveLength(255);
    expect(titleFromFileName('contrato_de__honorarios.pdf')).toBe('contrato de honorarios');
  });
});
