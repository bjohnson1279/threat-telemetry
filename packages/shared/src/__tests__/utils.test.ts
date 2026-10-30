import { describe, it, expect } from 'vitest';
import {
  generateId,
  normalizeIndicatorValue,
  detectIndicatorType,
  chunkArray,
  sanitizeForLog,
  sleep
} from '../utils.js';
import { IndicatorType } from '../types.js';

describe('Utils', () => {
  it('generates a valid UUID', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  describe('normalizeIndicatorValue', () => {
    it('lowercases domains, URLs, and emails', () => {
      expect(normalizeIndicatorValue(' EXAMPLE.com ', IndicatorType.DOMAIN)).toBe('example.com');
      expect(normalizeIndicatorValue(' HTTPS://EXAMPLE.COM ', IndicatorType.URL)).toBe('https://example.com');
      expect(normalizeIndicatorValue(' USER@DOMAIN.COM ', IndicatorType.EMAIL)).toBe('user@domain.com');
    });

    it('trims whitespace without lowercasing for IPs, hashes, and CVEs', () => {
      expect(normalizeIndicatorValue(' 192.168.1.1 ', IndicatorType.IP_ADDRESS)).toBe('192.168.1.1');
      expect(normalizeIndicatorValue(' CVE-2024-1234 ', IndicatorType.CVE)).toBe('CVE-2024-1234');
      const hash = 'A'.repeat(64);
      expect(normalizeIndicatorValue(` ${hash} `, IndicatorType.SHA256)).toBe(hash);
    });
  });

  describe('detectIndicatorType', () => {
    it('detects IPv4 addresses', () => {
      expect(detectIndicatorType('192.168.1.1')).toBe(IndicatorType.IP_ADDRESS);
      expect(detectIndicatorType('  10.0.0.1  ')).toBe(IndicatorType.IP_ADDRESS);
    });

    it('detects SHA256 hashes (exact 64 hex chars)', () => {
      expect(detectIndicatorType('a'.repeat(64))).toBe(IndicatorType.SHA256);
      expect(detectIndicatorType('A'.repeat(64))).toBe(IndicatorType.SHA256);
      expect(detectIndicatorType('0123456789abcdefABCDEF0123456789abcdefABCDEF0123456789abcdef0123')).toBe(IndicatorType.SHA256);
    });

    it('detects SHA1 hashes (exact 40 hex chars)', () => {
      expect(detectIndicatorType('b'.repeat(40))).toBe(IndicatorType.SHA1);
      expect(detectIndicatorType('B'.repeat(40))).toBe(IndicatorType.SHA1);
    });

    it('detects MD5 hashes (exact 32 hex chars)', () => {
      expect(detectIndicatorType('c'.repeat(32))).toBe(IndicatorType.MD5);
      expect(detectIndicatorType('C'.repeat(32))).toBe(IndicatorType.MD5);
    });

    it('falls back correctly for hex string off-by-one lengths', () => {
      expect(detectIndicatorType('a'.repeat(31))).toBe(IndicatorType.DOMAIN);
      expect(detectIndicatorType('a'.repeat(33))).toBe(IndicatorType.DOMAIN);
      expect(detectIndicatorType('a'.repeat(39))).toBe(IndicatorType.DOMAIN);
      expect(detectIndicatorType('a'.repeat(41))).toBe(IndicatorType.DOMAIN);
      expect(detectIndicatorType('a'.repeat(63))).toBe(IndicatorType.DOMAIN);
      expect(detectIndicatorType('a'.repeat(65))).toBe(IndicatorType.DOMAIN);
    });

    it('detects email addresses', () => {
      expect(detectIndicatorType('test@example.com')).toBe(IndicatorType.EMAIL);
      expect(detectIndicatorType('admin.user+tag@domain.co.uk')).toBe(IndicatorType.EMAIL);
    });

    it('detects CVEs', () => {
      expect(detectIndicatorType('CVE-2023-1234')).toBe(IndicatorType.CVE);
      expect(detectIndicatorType('CVE-2024-99999')).toBe(IndicatorType.CVE);
    });

    it('detects URLs', () => {
      expect(detectIndicatorType('https://example.com')).toBe(IndicatorType.URL);
      expect(detectIndicatorType('http://192.168.1.1/test')).toBe(IndicatorType.URL);
    });

    it('defaults to DOMAIN for other strings', () => {
      expect(detectIndicatorType('example.com')).toBe(IndicatorType.DOMAIN);
      expect(detectIndicatorType('sub.domain.threat.org')).toBe(IndicatorType.DOMAIN);
    });
  });

  describe('chunkArray', () => {
    it('splits array into correct chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = chunkArray(arr, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('handles chunk size larger than array length', () => {
      const arr = [1, 2];
      expect(chunkArray(arr, 5)).toEqual([[1, 2]]);
    });

    it('handles empty array', () => {
      expect(chunkArray([], 2)).toEqual([]);
    });
  });

  describe('sleep', () => {
    it('resolves after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(20);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(15);
    });
  });

  describe('sanitizeForLog', () => {
    it('redacts sensitive keys case-insensitively and includes api keys', () => {
      const obj = { username: 'user', PassWord: 'password123', API_KEY: 'sk-12345', other: 'data' };
      const sanitized = sanitizeForLog(obj);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).toContain('user');
      expect(sanitized).not.toContain('password123');
      expect(sanitized).not.toContain('sk-12345');
    });

    it('redacts token, secret, and apikey variations in nested structures', () => {
      const obj = {
        user: { secret: 'topsecret', token: 'tok-999' },
        config: { api_key: 'key-111', apikey: 'key-222' }
      };
      const sanitized = sanitizeForLog(obj);
      expect(sanitized).not.toContain('topsecret');
      expect(sanitized).not.toContain('tok-999');
      expect(sanitized).not.toContain('key-111');
      expect(sanitized).not.toContain('key-222');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('handles null, numbers, and primitive inputs safely', () => {
      expect(sanitizeForLog(null)).toBe('null');
      expect(sanitizeForLog(123)).toBe('123');
      expect(sanitizeForLog("clean_string")).toBe('"clean_string"');
    });
  });
});
