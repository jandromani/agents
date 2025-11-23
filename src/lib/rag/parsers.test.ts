import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { File as UndiciFile } from 'undici';

import {
  DocumentParser,
  MammothDocxAdapter,
  PdfParseAdapter,
  splitHierarchically,
  tokenize,
  type ParsedSection,
  type VectorStore,
} from './parsers';

beforeAll(() => {
  if (typeof File === 'undefined') {
    // @ts-expect-error - provide File shim for Node test environment
    globalThis.File = UndiciFile;
  }
});

vi.mock('pdf-parse', () => ({
  default: vi.fn(async () => ({
    text: 'Página uno en español\n\nPágina dos con más texto',
    info: { Title: 'Manual de Prueba' },
  })),
}));

vi.mock('pdfjs-dist', () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: async (pageNumber: number) => ({
        getTextContent: async () => ({
          items: [
            { str: `Contenido página ${pageNumber}` },
            { str: `Detalle ${pageNumber}` },
          ],
        }),
      }),
    }),
  }),
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(async () => ({
      value: 'Introducción\n\nPrimera sección detallada\n\nSegunda sección con más datos',
    })),
  },
}));

describe('PdfParseAdapter', () => {
  it('extracts page-level sections using pdf-parse and pdfjs', async () => {
    const adapter = new PdfParseAdapter();
    const buffer = new TextEncoder().encode('pdf').buffer;

    const sections = await adapter.extract(buffer);

    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Manual de Prueba');
    expect(sections[0].page).toBe(1);
    expect(sections[1].content).toContain('Contenido página 2');
  });
});

describe('MammothDocxAdapter with DocumentParser', () => {
  it('normalizes encoding, splits hierarchically and stores vector metadata', async () => {
    const docxAdapter = new MammothDocxAdapter();
    const vectorStore: VectorStore = {
      upsert: vi.fn().mockResolvedValue(undefined),
    };
    const parser = new DocumentParser(undefined, docxAdapter);
    const file = new File([new TextEncoder().encode('docx')], 'ejemplo.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const result = await parser.parse(file, {
      maxChunkSize: 20,
      minChunkSize: 5,
      overlap: 3,
      language: 'es',
      vectorStore,
    });

    expect(result.chunks.length).toBeGreaterThan(1);
    expect(result.extraction.metadata.language).toBe('es');
    expect(vectorStore.upsert).toHaveBeenCalled();
    result.chunks.forEach((chunk) => {
      expect(tokenize(chunk.content).length).toBeLessThanOrEqual(20);
    });
  });
});

describe('DocumentParser fallbacks', () => {
  it('derives sections from plaintext when no adapter exists', async () => {
    const parser = new DocumentParser();
    const file = new File(
      [new TextEncoder().encode('# Encabezado\nContenido de la sección\n\n## Subtítulo\nMás contenido')],
      'texto.txt',
      { type: 'text/plain' },
    );

    const { extraction } = await parser.parse(file, { language: 'es', maxChunkSize: 12, minChunkSize: 4, overlap: 2 });

    expect(extraction.sections.length).toBeGreaterThanOrEqual(1);
    expect(extraction.metadata.filename).toBe('texto.txt');
  });
});

describe('splitHierarchically', () => {
  it('keeps chunks under the maximum size', () => {
    const content = 'Párrafo uno. Párrafo dos con más palabras. Párrafo tres todavía más largo.';
    const chunks = splitHierarchically(content, { maxChunkSize: 8, minChunkSize: 3, overlap: 2 });

    chunks.forEach((chunk) => expect(tokenize(chunk).length).toBeLessThanOrEqual(8));
    expect(chunks.length).toBeGreaterThan(1);
  });
});

describe('Performance envelope', () => {
  it('processes twenty pages in under five seconds', async () => {
    const sections: ParsedSection[] = Array.from({ length: 20 }, (_, index) => ({
      content: `Página ${index + 1} ` + 'contenido '.repeat(80),
      page: index + 1,
    }));
    const fastAdapter = { extract: async () => sections };
    const parser = new DocumentParser(fastAdapter);
    const file = new File([new TextEncoder().encode('pdf')], 'velocidad.pdf', { type: 'application/pdf' });

    const start = performance.now();
    const result = await parser.parse(file, { maxChunkSize: 50, minChunkSize: 10, overlap: 5, language: 'es' });
    const duration = performance.now() - start;

    expect(result.chunks.length).toBeGreaterThan(20);
    expect(duration).toBeLessThan(5000);
  });
});
