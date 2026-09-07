export enum IndicatorType {
  IP_ADDRESS = 'IP_ADDRESS',
  IP = 'IP',
  DOMAIN = 'DOMAIN',
  URL = 'URL',
  SHA256 = 'SHA256',
  SHA1 = 'SHA1',
  MD5 = 'MD5',
  EMAIL = 'EMAIL',
  CVE = 'CVE',
}

export enum ThreatSeverity {
  LOW = 'LOW',
  MED = 'MED',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ThreatIndicator {
  id: string;
  indicatorValue: string;
  indicatorType: IndicatorType;
  severity: ThreatSeverity;
  confidenceScore: number;
  enrichmentSummary: string | null;
  mitreTechniques: string[];
  rawPayload: Record<string, unknown>;
  firstSeen: Date;
  lastSeen: Date;
  createdAt: Date;
}

export interface IngestPayload {
  indicators: RawIndicator[];
}

export interface RawIndicator {
  value: string;
  type: IndicatorType;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  rawPayload?: Record<string, unknown>;
}

export interface EnrichmentResult {
  severity: ThreatSeverity;
  confidenceScore: number;
  mitreTechniques: string[];
  analystBrief: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ThreatIndicatorFilter {
  search?: string;
  indicatorType?: IndicatorType;
  severity?: ThreatSeverity;
  minConfidence?: number;
  maxConfidence?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
