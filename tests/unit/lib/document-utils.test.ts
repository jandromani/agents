import { describe, it, expect } from 'vitest';

function normalizeText(text: string): string {
  if (!text) return '';
  const cleanedLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n\n')
    .split('\n')
    .map((line: string) => line.replace(/\s+/g, ' ').trim());
  const compacted = cleanedLines.reduce<string[]>((acc, line) => {
    if (line === '' && acc[acc.length - 1] === '') return acc;
    acc.push(line);
    return acc;
  }, []);
  return compacted.join('\n').trim();
}

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
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
        const overlapStart = Math.max(0, currentChunk.length - overlap);
        currentChunk = `${currentChunk.slice(overlapStart)}\n\n${trimmed}`;
      } else {
        currentChunk = trimmed;
      }
    }
  }
  if (currentChunk.trim().length >= 50) chunks.push(currentChunk.trim());
  return chunks;
}

function isProbablyBase64(value: string): boolean {
  if (!value || value.length < 16) return false;
  if (value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

describe('document utils - normalizeText', () => {
  it('normalizes CRLF to LF', () => {
    expect(normalizeText('line1\r\nline2')).toBe('line1\nline2');
  });

  it('converts form feed to double newline', () => {
    const result = normalizeText('page1\fpage2');
    expect(result).toContain('page1');
    expect(result).toContain('page2');
  });

  it('collapses multiple blank lines to single', () => {
    const result = normalizeText('para1\n\n\n\npara2');
    expect(result).not.toContain('\n\n\n');
  });

  it('trims result', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeText('')).toBe('');
  });
});

describe('document utils - chunkText', () => {
  it('returns empty array for empty text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('keeps short text as single chunk', () => {
    const short = 'This is a short paragraph that should fit in a single chunk.';
    const result = chunkText(short, 1000, 200);
    expect(result.length).toBe(1);
    expect(result[0]).toContain('short paragraph');
  });

  it('splits long text into multiple chunks', () => {
    const paragraphs = Array(10).fill('word '.repeat(30)).join('\n\n');
    const result = chunkText(paragraphs, 200, 50);
    expect(result.length).toBeGreaterThan(1);
  });

  it('all chunks are non-empty strings', () => {
    const text = Array(10).fill('A complete sentence about something interesting.').join('\n\n');
    const result = chunkText(text, 200, 50);
    result.forEach(c => {
      expect(c.trim().length).toBeGreaterThan(0);
    });
  });

  it('no chunk is shorter than minChunkSize (50)', () => {
    const text = 'Short.\n\nA longer paragraph that definitely has more than fifty characters in it.\n\nAnother one here too.';
    const result = chunkText(text, 200, 30);
    result.forEach(c => expect(c.trim().length).toBeGreaterThanOrEqual(50));
  });
});

describe('document utils - isProbablyBase64', () => {
  it('returns false for short strings', () => {
    expect(isProbablyBase64('abc')).toBe(false);
  });

  it('returns false for strings with invalid characters', () => {
    expect(isProbablyBase64('not-valid-base64!!!!!!!!')).toBe(false);
  });

  it('returns true for valid base64 string', () => {
    const b64 = btoa('hello world this is a test');
    expect(isProbablyBase64(b64)).toBe(true);
  });

  it('returns false if length not divisible by 4', () => {
    expect(isProbablyBase64('AAAA' + 'A')).toBe(false);
  });
});

describe('document utils - estimateTokens', () => {
  it('estimates roughly 1 token per 4 characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('rounds up for non-divisible lengths', () => {
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});
