import pdfParse from 'pdf-parse';
import { getDocument } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import mammoth from 'mammoth';

export type ParsedSection = {
  title?: string;
  content: string;
  page?: number;
  path?: string;
};

export type Chunk = {
  id: string;
  content: string;
  section?: string;
  page?: number;
  order: number;
};

export type ExtractionResult = {
  rawText: string;
  sections: ParsedSection[];
  metadata: Record<string, string | number | boolean>;
};

export interface PDFAdapter {
  extract(buffer: ArrayBuffer): Promise<ParsedSection[]>;
}

export interface DocxAdapter {
  extract(buffer: ArrayBuffer): Promise<ParsedSection[]>;
}

export interface NormalizationOptions {
  language?: string;
  maxChunkSize?: number;
  minChunkSize?: number;
  overlap?: number;
  vectorStore?: VectorStore;
}

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
}

export type VectorRecord = {
  id: string;
  content: string;
  metadata: Record<string, string | number | boolean>;
};

const DEFAULT_OPTIONS: Required<Pick<NormalizationOptions, 'maxChunkSize' | 'minChunkSize' | 'overlap'>> = {
  maxChunkSize: 1200,
  minChunkSize: 400,
  overlap: 120,
};

export class PdfParseAdapter implements PDFAdapter {
  constructor(private readonly pdfjsLoader: typeof getDocument = getDocument) {}

  async extract(buffer: ArrayBuffer): Promise<ParsedSection[]> {
    const data = new Uint8Array(buffer);
    const [parsed, pdf] = await Promise.all([pdfParse(data), this.loadDocument(data)]);

    if (!pdf) {
      return this.buildSectionsFromText(parsed.text);
    }

    const sections: ParsedSection[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : (item as { str?: string }).str ?? ''))
        .join(' ');

      sections.push({
        title: parsed.info?.Title ?? undefined,
        content: pageText || parsed.text,
        page: pageNumber,
      });
    }

    return sections.length ? sections : this.buildSectionsFromText(parsed.text);
  }

  private async loadDocument(data: Uint8Array): Promise<PDFDocumentProxy | null> {
    try {
      return await this.pdfjsLoader({ data }).promise;
    } catch (error) {
      console.warn('Unable to load PDF with pdfjs', error);
      return null;
    }
  }

  private buildSectionsFromText(text: string): ParsedSection[] {
    const pages = text.split(/\f|\n\s*\n/g).filter(Boolean);
    return pages.map((content, index) => ({
      content,
      page: index + 1,
    }));
  }
}

export class MammothDocxAdapter implements DocxAdapter {
  async extract(buffer: ArrayBuffer): Promise<ParsedSection[]> {
    const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
    const paragraphs = value
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (!paragraphs.length) return [{ content: normalizeWhitespace(value) }];

    return paragraphs.map((paragraph, index) => ({
      title: index === 0 ? 'Document' : undefined,
      content: paragraph,
      page: Math.floor(index / 2) + 1, // approximate pages for large paragraphs
    }));
  }
}

export class DocumentParser {
  constructor(
    private readonly pdfAdapter?: PDFAdapter,
    private readonly docxAdapter?: DocxAdapter,
  ) {}

  async parse(
    file: File,
    options: NormalizationOptions = {},
  ): Promise<{ chunks: Chunk[]; extraction: ExtractionResult }> {
    const buffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pdf' && this.pdfAdapter) {
      const sections = await this.pdfAdapter.extract(buffer);
      return this.buildChunks(sections, file, options);
    }

    if (['doc', 'docx'].includes(extension || '') && this.docxAdapter) {
      const sections = await this.docxAdapter.extract(buffer);
      return this.buildChunks(sections, file, options);
    }

    // Fallback: best-effort text decoding (works for plain text uploads)
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const fallbackSections = this.deriveSections(decoded);
    return this.buildChunks(fallbackSections, file, options);
  }

  private async buildChunks(
    sections: ParsedSection[],
    file: File,
    options: NormalizationOptions,
  ): Promise<{ chunks: Chunk[]; extraction: ExtractionResult }> {
    const normalizedLanguage = normalizeLanguage(options.language);
    const normalizedSections = sections.map((section) => ({
      ...section,
      content: normalizeEncoding(section.content, normalizedLanguage),
    }));

    const chunks: Chunk[] = [];
    const { maxChunkSize, minChunkSize, overlap } = { ...DEFAULT_OPTIONS, ...options };

    normalizedSections.forEach((section) => {
      const hierarchicalChunks = splitHierarchically(section.content, {
        maxChunkSize,
        minChunkSize,
        overlap,
      });

      hierarchicalChunks.forEach((content, index) => {
        chunks.push({
          id: `${file.name}-${section.page ?? 0}-${index}`,
          content,
          section: section.title,
          page: section.page,
          order: index,
        });
      });
    });

    const extraction: ExtractionResult = {
      rawText: normalizedSections.map((section) => section.content).join('\n\n'),
      sections: normalizedSections,
      metadata: {
        filename: file.name,
        size: file.size,
        type: file.type,
        generatedAt: Date.now(),
        language: normalizedLanguage,
        encoding: 'utf-8',
      },
    };

    if (options.vectorStore) {
      await options.vectorStore.upsert(
        chunks.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          metadata: {
            ...extraction.metadata,
            section: chunk.section || 'body',
            page: chunk.page ?? -1,
            order: chunk.order,
          },
        })),
      );
    }

    return { chunks, extraction };
  }

  private deriveSections(content: string): ParsedSection[] {
    const lines = content.split(/\r?\n/);
    const sections: ParsedSection[] = [];
    let current: ParsedSection | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (/^#{1,6}\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        if (current) sections.push(current);
        current = { title: trimmed.replace(/^#+\s+/, ''), content: '' };
      } else {
        if (!current) {
          current = { title: undefined, content: trimmed };
        } else {
          current.content += ` ${trimmed}`;
        }
      }
    });

    if (current) sections.push(current);
    return sections.length ? sections : [{ content }];
  }
}

export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeWhitespace(input)
    .split(' ')
    .filter(Boolean);
}

export function splitHierarchically(
  content: string,
  options: Required<Pick<NormalizationOptions, 'maxChunkSize' | 'minChunkSize' | 'overlap'>>,
): string[] {
  const sentences = flattenParagraphs(content);
  const chunks: string[] = [];
  let buffer: string[] = [];

  const pushBuffer = () => {
    if (!buffer.length) return;
    const materialized = buffer.join(' ').trim();
    if (materialized.length >= options.minChunkSize || !chunks.length) {
      chunks.push(materialized);
      return;
    }

    const lastChunk = chunks.pop();
    const merged = normalizeWhitespace(`${lastChunk ?? ''} ${materialized}`);
    chunks.push(merged);
  };

  sentences.forEach((sentence) => {
    const sentenceTokens = tokenize(sentence);

    if (sentenceTokens.length > options.maxChunkSize) {
      // Split oversized sentences on token boundaries.
      const oversizedChunks = sliceTokens(sentenceTokens, options.maxChunkSize, options.overlap);
      oversizedChunks.forEach((chunkTokens, index) => {
        const tokenSlice = index === 0 ? [...buffer, ...chunkTokens] : chunkTokens;
        buffer = tokenSlice.slice(-options.overlap);
        chunks.push(normalizeWhitespace(tokenSlice.join(' ')));
      });
      return;
    }

    if (buffer.length + sentenceTokens.length > options.maxChunkSize) {
      pushBuffer();
      buffer = buffer.slice(-options.overlap);
    }

    buffer = buffer.concat(sentenceTokens);
  });

  pushBuffer();
  return chunks.map((chunk) => normalizeWhitespace(chunk));
}

function sliceTokens(tokens: string[], maxChunkSize: number, overlap: number): string[][] {
  const slices: string[][] = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(tokens.length, start + maxChunkSize);
    const segment = tokens.slice(start, end);
    slices.push(segment);

    if (end === tokens.length) break;
    start = end - overlap;
  }

  return slices;
}

function flattenParagraphs(content: string): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.flatMap((paragraph) => {
    const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑÜ]|\d)/u);
    return sentences.length ? sentences : [paragraph];
  });
}

export function normalizeEncoding(input: string, _language: string): string {
  return normalizeWhitespace(input.replace(/^\uFEFF/, '')).normalize('NFC');
}

export function normalizeLanguage(language?: string): string {
  if (!language) return 'und';
  return language.trim().toLowerCase();
}
