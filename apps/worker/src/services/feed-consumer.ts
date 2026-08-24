import { IndicatorType, ThreatSeverity } from '@threat-telemetry/shared';

export interface RawIndicator {
  value: string;
  type: IndicatorType;
  severity: ThreatSeverity;
  rawPayload: any;
}

export class MockFeedConsumer {
  async fetchNewIndicators(): Promise<RawIndicator[]> {
    const count = Math.floor(Math.random() * 6) + 3; // 3 to 8
    const indicators: RawIndicator[] = [];

    for (let i = 0; i < count; i++) {
      const isIp = Math.random() > 0.5;
      const type = isIp ? 'IP' : 'DOMAIN';
      const severity = 'HIGH';
      
      const value = isIp 
        ? `185.220.101.${Math.floor(Math.random() * 255)}`
        : `malware-c2-domain-${Math.floor(Math.random() * 1000)}.evil.com`;

      indicators.push({
        value,
        type: type as IndicatorType,
        severity: severity as ThreatSeverity,
        rawPayload: {
          source: 'MockFeed',
          timestamp: new Date().toISOString(),
          details: 'Mock payload'
        }
      });
    }

    return indicators;
  }
}
