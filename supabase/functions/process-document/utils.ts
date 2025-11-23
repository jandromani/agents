import { Buffer } from 'node:buffer';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export interface ExtractTextParams {
  providedText?: string;
  base64Payload?: string;
  storedRawContent?: string | null;
  fileType?: string | null;
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
    const pdfResult = await pdfParse(Buffer.from(binaryPayload));
    return normalizeText(pdfResult.text || '');
  }

  if (isDocxType(normalizedType) && binaryPayload) {
    const docxResult = await mammoth.extractRawText({ buffer: Buffer.from(binaryPayload) });
    return normalizeText(docxResult.value || '');
  }

  const fallbackText = providedText ?? storedRawContent ?? '';
  return normalizeText(fallbackText);
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
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let currentChunk = '';
  let currentSize = 0;

  for (const sentence of sentences) {
    const sentenceSize = sentence.length;

    if (currentSize + sentenceSize > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
      currentSize = currentChunk.length;
    } else {
      currentChunk += sentence;
      currentSize += sentenceSize;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 50);
}

export function isProbablyBase64(value: string): boolean {
  if (!value || value.length < 16) return false;
  if (value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
