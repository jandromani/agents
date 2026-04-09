import { Buffer } from 'node:buffer';
import mammoth from 'npm:mammoth';
import pdfParse from 'npm:pdf-parse';

export interface ExtractTextParams {
  providedText?: string;
  base64Payload?: string;
  storedRawContent?: string | null;
  fileType?: string | null;
}

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  wordCount: number;
  metadata: Record<string, string | number | boolean>;
}

export async function extractTextContent({
  providedText,
  base64Payload,
  storedRawContent,
  fileType,
}: ExtractTextParams): Promise<string> {
  const normalizedType = fileType?.toLowerCase() || '';
  const binaryPayload =
    decodeBase64Payload(base64Payload) ||
    decodeBase64Payload(storedRawContent) ||
    decodeBase64Payload(providedText);

  if (isPdfType(normalizedType) && binaryPayload) {
    const result = await extractPdfText(Buffer.from(binaryPayload));
    return result.text;
  }

  if (isDocxType(normalizedType) && binaryPayload) {
    const result = await extractDocxText(Buffer.from(binaryPayload));
    return result.text;
  }

  const fallbackText = providedText ?? storedRawContent ?? '';
  return normalizeText(fallbackText);
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const parsed = await pdfParse(buffer, {
      pagerender: (pageData: any) => {
        const renderOptions = {
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        };
        return pageData.getTextContent(renderOptions).then((textContent: any) => {
          let lastY = -1;
          const lines: string[] = [];

          for (const item of textContent.items) {
            if ('str' in item) {
              if (lastY !== item.transform[5] && lines.length > 0) {
                lines.push('\n');
              }
              lines.push(item.str);
              lastY = item.transform[5];
            }
          }

          return lines.join(' ');
        });
      },
    });

    const text = normalizeText(parsed.text || '');
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return {
      text,
      pageCount: parsed.numpages,
      wordCount,
      metadata: {
        title: parsed.info?.Title || '',
        author: parsed.info?.Author || '',
        subject: parsed.info?.Subject || '',
        pageCount: parsed.numpages,
        pdfVersion: parsed.info?.PDFFormatVersion || '',
      },
    };
  } catch (primaryError) {
    console.warn('Primary PDF extraction failed, using fallback:', primaryError);
    try {
      const parsed = await pdfParse(buffer);
      const text = normalizeText(parsed.text || '');
      return {
        text,
        pageCount: parsed.numpages,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        metadata: { pageCount: parsed.numpages },
      };
    } catch (fallbackError) {
      throw new Error(`PDF extraction failed: ${fallbackError}`);
    }
  }
}

export async function extractDocxText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const [rawResult, htmlResult] = await Promise.allSettled([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);

    let text = '';
    if (rawResult.status === 'fulfilled') {
      text = rawResult.value.value || '';
      if (rawResult.value.messages.length > 0) {
        console.warn('DOCX extraction warnings:', rawResult.value.messages);
      }
    }

    if (!text && htmlResult.status === 'fulfilled') {
      text = htmlResult.value.value
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }

    const normalized = normalizeText(text);
    return {
      text: normalized,
      wordCount: normalized.split(/\s+/).filter(Boolean).length,
      metadata: {
        warnings: rawResult.status === 'fulfilled' ? rawResult.value.messages.length : 0,
      },
    };
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error}`);
  }
}

export function decodeBase64Payload(raw?: string | null): Uint8Array | null {
  if (!raw) return null;

  const sanitized = raw.replace(/\s+/g, '');

  if (!isProbablyBase64(sanitized)) {
    return null;
  }

  try {
    return Buffer.from(sanitized, 'base64');
  } catch {
    return null;
  }
}

export function isPdfType(fileType?: string | null): boolean {
  if (!fileType) return false;
  return fileType.includes('pdf');
}

export function isDocxType(fileType?: string | null): boolean {
  if (!fileType) return false;
  return (
    fileType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
    fileType.endsWith('.docx') ||
    fileType.includes('docx')
  );
}

export function normalizeText(text: string): string {
  if (!text) return '';

  const cleanedLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n\n')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim());

  const compacted = cleanedLines.reduce<string[]>((acc, line) => {
    if (line === '' && acc[acc.length - 1] === '') {
      return acc;
    }
    acc.push(line);
    return acc;
  }, []);

  return compacted.join('\n').trim();
}

export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  if (!text || text.trim().length === 0) return [];

  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 2 <= chunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmed}` : trimmed;
    } else {
      if (currentChunk.length >= 50) {
        chunks.push(currentChunk.trim());
        const overlapText = extractOverlapText(currentChunk, overlap);
        currentChunk = overlapText ? `${overlapText}\n\n${trimmed}` : trimmed;
      } else {
        currentChunk = trimmed;
      }

      while (currentChunk.length > chunkSize) {
        const boundary = findSentenceBoundary(currentChunk, chunkSize);
        const chunk = currentChunk.slice(0, boundary).trim();
        if (chunk.length >= 50) {
          chunks.push(chunk);
        }
        const overlapStart = Math.max(0, boundary - overlap);
        currentChunk = currentChunk.slice(overlapStart).trim();
      }
    }
  }

  if (currentChunk.trim().length >= 50) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function findSentenceBoundary(text: string, maxPos: number): number {
  const searchRegion = text.slice(0, maxPos);
  const sentenceEnd = searchRegion.lastIndexOf('. ');
  if (sentenceEnd > maxPos * 0.5) return sentenceEnd + 1;

  const paragraphEnd = searchRegion.lastIndexOf('\n');
  if (paragraphEnd > maxPos * 0.5) return paragraphEnd + 1;

  return maxPos;
}

function extractOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) return text;
  const overlapStart = text.length - overlapSize;
  const sentenceStart = text.indexOf('. ', overlapStart);
  if (sentenceStart !== -1 && sentenceStart < text.length - 20) {
    return text.slice(sentenceStart + 2);
  }
  return text.slice(overlapStart);
}

export function isProbablyBase64(value: string): boolean {
  if (!value || value.length < 16) return false;
  if (value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
