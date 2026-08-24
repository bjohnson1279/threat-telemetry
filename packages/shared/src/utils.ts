import * as crypto from 'node:crypto';
import { IndicatorType } from './types.js';

export function generateId(): string {
  return crypto.randomUUID();
}

export function normalizeIndicatorValue(value: string, type: IndicatorType): string {
  let normalized = value.trim();
  if (type === IndicatorType.DOMAIN || type === IndicatorType.EMAIL || type === IndicatorType.URL) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

export function detectIndicatorType(value: string): IndicatorType {
  const trimmed = value.trim();
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(trimmed)) return IndicatorType.IP_ADDRESS;
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return IndicatorType.SHA256;
  if (/^[a-fA-F0-9]{40}$/.test(trimmed)) return IndicatorType.SHA1;
  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) return IndicatorType.MD5;
  if (trimmed.includes('@')) return IndicatorType.EMAIL;
  if (trimmed.startsWith('CVE-')) return IndicatorType.CVE;
  if (trimmed.startsWith('http')) return IndicatorType.URL;
  return IndicatorType.DOMAIN;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeForLog(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    if (key === 'password' || key === 'token' || key === 'secret') return '[REDACTED]';
    return value;
  });
}
