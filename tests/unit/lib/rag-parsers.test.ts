import { describe, it, expect } from 'vitest';
import {
  normalizeWhitespace,
  tokenize,
  splitHierarchically,
  normalizeEncoding,
  normalizeLanguage,
} from '../../../src/lib/rag/parsers';

describe('RAG parsers - normalizeWhitespace', () => {
  it('collapses multiple spaces into one', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  trim me  ')).toBe('trim me');
  });

  it('removes control characters', () => {
    expect(normalizeWhitespace('hello\u0000world')).toBe('helloworld');
  });

  it('handles empty string', () => {
    expect(normalizeWhitespace('')).toBe('');
  });
});

describe('RAG parsers - tokenize', () => {
  it('splits sentence into tokens', () => {
    const tokens = tokenize('The quick brown fox');
    expect(tokens).toEqual(['The', 'quick', 'brown', 'fox']);
  });

  it('filters empty tokens', () => {
    const tokens = tokenize('  spaces   between   words  ');
    expect(tokens.every(t => t.length > 0)).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('RAG parsers - splitHierarchically', () => {
  const opts = { maxChunkSize: 20, minChunkSize: 5, overlap: 3 };

  it('returns array of strings', () => {
    const result = splitHierarchically('Hello world. How are you today?', opts);
    expect(Array.isArray(result)).toBe(true);
    result.forEach(c => expect(typeof c).toBe('string'));
  });

  it('each chunk does not exceed maxChunkSize in tokens', () => {
    const longText = Array(50).fill('word').join(' ');
    const result = splitHierarchically(longText, opts);
    result.forEach(chunk => {
      const tokenCount = chunk.split(' ').filter(Boolean).length;
      expect(tokenCount).toBeLessThanOrEqual(opts.maxChunkSize + opts.overlap + 5);
    });
  });

  it('handles short text that fits in one chunk', () => {
    const result = splitHierarchically('short text', opts);
    expect(result.length).toBe(1);
    expect(result[0]).toContain('short text');
  });

  it('produces non-empty chunks', () => {
    const result = splitHierarchically('A complete sentence. Another sentence here.', opts);
    result.forEach(c => expect(c.trim().length).toBeGreaterThan(0));
  });
});

describe('RAG parsers - normalizeEncoding', () => {
  it('strips BOM from start of string', () => {
    const withBom = '\uFEFFHello world';
    expect(normalizeEncoding(withBom, 'en')).toBe('Hello world');
  });

  it('normalizes to NFC form', () => {
    const composed = 'café';
    const result = normalizeEncoding(composed, 'fr');
    expect(result).toBe(composed.normalize('NFC'));
  });

  it('trims whitespace', () => {
    expect(normalizeEncoding('  trimmed  ', 'en')).toBe('trimmed');
  });
});

describe('RAG parsers - normalizeLanguage', () => {
  it('returns und for undefined', () => {
    expect(normalizeLanguage(undefined)).toBe('und');
  });

  it('lowercases and trims language code', () => {
    expect(normalizeLanguage('  ES  ')).toBe('es');
    expect(normalizeLanguage('EN-US')).toBe('en-us');
  });

  it('handles empty string', () => {
    expect(normalizeLanguage('')).toBe('und');
  });
});
