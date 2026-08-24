import { describe, it, expect } from 'vitest';
import {
  generateId,
  normalizeIndicatorValue,
  detectIndicatorType,
  chunkArray,
  sanitizeForLog
} from '../utils.js';
import { IndicatorType } from '../types.js';

describe('Utils', () => {
  it('generates a valid UUID', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  describe('normalizeIndicatorValue', () => {
    it('lowercases domains and URLs', () => {
      expect(normalizeIndicatorValue(' EXAMPLE.com ', IndicatorType.DOMAIN)).toBe('example.com');
      expect(normalizeIndicatorValue(' HTTPS://EXAMPLE.COM ', IndicatorType.URL)).toBe('https://example.com');
    });

    it('trims whitespace for IPs without lowercasing', () => {
      expect(normalizeIndicatorValue(' 192.168.1.1 ', IndicatorType.IP_ADDRESS)).toBe('192.168.1.1');
    });
  });

  describe('detectIndicatorType', () => {
    it('detects IPv4 addresses', () => {
      expect(detectIndicatorType('192.168.1.1')).toBe(IndicatorType.IP_ADDRESS);
    });

    it('detects SHA256 hashes', () => {
      expect(detectIndicatorType('a'.repeat(64))).toBe(IndicatorType.SHA256);
    });

    it('detects SHA1 hashes', () => {
      expect(detectIndicatorType('a'.repeat(40))).toBe(IndicatorType.SHA1);
    });

    it('detects MD5 hashes', () => {
      expect(detectIndicatorType('a'.repeat(32))).toBe(IndicatorType.MD5);
    });

    it('detects email addresses', () => {
      expect(detectIndicatorType('test@example.com')).toBe(IndicatorType.EMAIL);
    });

    it('detects CVEs', () => {
      expect(detectIndicatorType('CVE-2023-1234')).toBe(IndicatorType.CVE);
    });

    it('detects URLs', () => {
      expect(detectIndicatorType('https://example.com')).toBe(IndicatorType.URL);
    });

    it('defaults to DOMAIN', () => {
      expect(detectIndicatorType('example.com')).toBe(IndicatorType.DOMAIN);
    });
  });

  describe('chunkArray', () => {
    it('splits array into correct chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = chunkArray(arr, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('handles empty array', () => {
      expect(chunkArray([], 2)).toEqual([]);
    });
  });

  describe('sanitizeForLog', () => {
    it('redacts sensitive keys', () => {
      const obj = { username: 'user', password: 'password123', other: 'data' };
      const sanitized = sanitizeForLog(obj);
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).toContain('user');
      expect(sanitized).not.toContain('password123');
    });
  });
});
