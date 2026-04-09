import { describe, it, expect, vi } from 'vitest';

vi.mock('npm:mammoth', () => ({
  default: {
    extractRawText: vi.fn(async () => ({ value: 'Docx content line', messages: [] })),
    convertToHtml: vi.fn(async () => ({ value: '<p>Docx content line</p>', messages: [] })),
  },
}));

vi.mock('npm:pdf-parse', () => ({
  default: vi.fn(async () => ({ text: 'PDF content', numpages: 1, info: {} })),
}));

describe('process-document utilities', () => {
  it('decodes base64 payloads and normalizes text', async () => {
    const utils = await import('../../supabase/functions/process-document/utils');
    const longEnough = Buffer.from('hello world this is long enough').toString('base64');
    const payload = utils.decodeBase64Payload(longEnough);
    expect(payload).not.toBeNull();
    expect(payload!.length).toBeGreaterThan(0);

    const normalized = utils.normalizeText(' Linea 1\n\n   Linea 2  ');
    expect(normalized).toContain('Linea 1');
    expect(normalized).toContain('Linea 2');
  });

  it('extracts content based on file type and chunks results', async () => {
    const utils = await import('../../supabase/functions/process-document/utils');
    const pdfBase64 = Buffer.from('pdf data content that is long enough').toString('base64');
    const text = await utils.extractTextContent({
      base64Payload: pdfBase64,
      fileType: 'application/pdf',
    });
    expect(text).toContain('PDF content');

    const chunks = utils.chunkText('Sentence one. Sentence two. Sentence three that is longer.');
    expect(chunks.length).toBeGreaterThan(0);
  });
});
