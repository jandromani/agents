import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(async () => ({ value: 'Docx content line' })),
  },
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn(async () => ({ text: 'PDF content' })),
}));

describe('process-document utilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('decodes base64 payloads and normalizes text', async () => {
    const utils = await import('../../supabase/functions/process-document/utils');
    const payload = utils.decodeBase64Payload(Buffer.from('hola').toString('base64'));
    expect(payload).toBeInstanceOf(Uint8Array);

    const normalized = utils.normalizeText(' Linea 1\n\n   Linea 2  ');
    expect(normalized).toBe('Linea 1\nLinea 2');
  });

  it('extracts content based on file type and chunks results', async () => {
    const utils = await import('../../supabase/functions/process-document/utils');
    const text = await utils.extractTextContent({
      base64Payload: Buffer.from('pdf data').toString('base64'),
      fileType: 'application/pdf',
    });
    expect(text).toContain('PDF content');

    const chunks = utils.chunkText('Sentence one. Sentence two. Sentence three that is longer.');
    expect(chunks.length).toBeGreaterThan(0);
  });
});
