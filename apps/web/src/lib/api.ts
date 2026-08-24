import { ThreatIndicator, PaginatedResponse, ThreatIndicatorFilter } from '@threat-telemetry/shared';

const API_BASE = '/api/v1';

export interface StatsResponse {
  total: number;
  critical: number;
  high: number;
  avgConfidence: number;
  activeMitreTechniques: number;
}

export interface IngestPayload {
  indicators: any[];
}

export async function fetchIndicators(filters: ThreatIndicatorFilter): Promise<PaginatedResponse<ThreatIndicator>> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.indicatorType) params.append('indicatorType', filters.indicatorType);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.minConfidence !== undefined) params.append('minConfidence', filters.minConfidence.toString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const res = await fetch(`${API_BASE}/indicators?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch indicators');
  return res.json();
}

export async function fetchIndicator(id: string): Promise<ThreatIndicator> {
  const res = await fetch(`${API_BASE}/indicators/${id}`);
  if (!res.ok) throw new Error('Failed to fetch indicator');
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/indicators/stats/summary`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function ingestIndicators(payload: IngestPayload): Promise<{ ingested: number }> {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to ingest indicators');
  return res.json();
}

export async function triggerEnrichment(id: string): Promise<ThreatIndicator> {
  const res = await fetch(`${API_BASE}/indicators/${id}/enrich`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger enrichment');
  return res.json();
}
