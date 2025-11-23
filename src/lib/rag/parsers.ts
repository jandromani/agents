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
}

const DEFAULT_OPTIONS: Required<Pick<NormalizationOptions, 'maxChunkSize' | 'minChunkSize' | 'overlap'>> = {
  maxChunkSize: 1200,
  minChunkSize: 400,
  overlap: 120,
};

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

  private buildChunks(
    sections: ParsedSection[],
    file: File,
    options: NormalizationOptions,
  ): { chunks: Chunk[]; extraction: ExtractionResult } {
    const normalizedSections = sections.map((section) => ({
      ...section,
      content: normalizeWhitespace(section.content),
    }));

    const chunks: Chunk[] = [];
    const { maxChunkSize, minChunkSize, overlap } = { ...DEFAULT_OPTIONS, ...options };

    normalizedSections.forEach((section) => {
      const tokens = tokenize(section.content);
      let start = 0;
      let order = 0;

      while (start < tokens.length) {
        const end = Math.min(start + maxChunkSize, tokens.length);
        const slice = tokens.slice(start, end);
        const content = slice.join(' ').trim();

        if (content.length >= minChunkSize) {
          chunks.push({
            id: `${file.name}-${section.page ?? 0}-${order}`,
            content,
            section: section.title,
            page: section.page,
            order,
          });
        }

        if (end === tokens.length) break;
        start = end - overlap;
        order += 1;
      }
    });

    return {
      chunks,
      extraction: {
        rawText: normalizedSections.map((section) => section.content).join('\n\n'),
        sections: normalizedSections,
        metadata: {
          filename: file.name,
          size: file.size,
          type: file.type,
          generatedAt: Date.now(),
        },
      },
    };
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
