# Indicators & Ingestion API Reference

Detailed endpoint reference for ingestion, indicator queries, metrics summary, and on-demand threat enrichment.

---

## 1. Ingest Threat Indicators

Ingest batches of threat indicators into the system. Supports both JSON arrays and raw CSV formatted payloads.

- **Method**: `POST`
- **Route Path**: `/api/v1/ingest` (also accessible via `/api/v1/indicators`)
- **Workflow Context**: Used by external threat intelligence feeds, automated SIEM pipelines, or analyst bulk upload scripts to populate raw indicators. Indicators are normalized and saved with initial `LOW` severity and `0` confidence pending enrichment.

### Headers

| Header | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `x-api-key` | string | **Required** | Internal API authentication key |
| `Content-Type` | string | **Required** | `application/json` or `text/csv` |

### Request Body

#### JSON Format (`Content-Type: application/json`)

- Maximum batch size: 10,000 indicators.

```json
{
  "indicators": [
    {
      "value": "198.51.100.42",
      "type": "IP",
      "source": "firewall-logs",
      "tags": ["c2", "apt29"],
      "metadata": {
        "asn": 13335
      },
      "rawPayload": {
        "rawLog": "connection attempt to 198.51.100.42"
      }
    }
  ]
}
```

##### Field Breakdown

| Field | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `indicators` | Array | **Required** | Array of raw indicator objects (min: 1, max: 10,000) |
| `indicators[].value` | string | **Required** | Indicator value (1–2048 characters) |
| `indicators[].type` | string | **Required** | Indicator type enum: `IP`, `DOMAIN`, `URL`, `FILE_HASH_MD5`, `FILE_HASH_SHA256`, `EMAIL`, `CVE` |
| `indicators[].source` | string | Optional | Source identifier (max 256 characters) |
| `indicators[].tags` | string[] | Optional | Array of tags (max 100 tags, each max 256 characters) |
| `indicators[].metadata` | object | Optional | Key-value dictionary of metadata |
| `indicators[].rawPayload`| object | Optional | Unmodified raw telemetry record |

#### CSV Format (`Content-Type: text/csv`)

- Raw CSV with header row containing `value` and `type` (optional headers: `source`, `tags`).
- Tags can be delimited with semicolons `;`.
- Maximum line limit: 10,000 lines.

```csv
value,type,source,tags
evil.example.com,DOMAIN,osint,phishing;malware
198.51.100.42,IP,honeypot,scanner
```

### Responses

#### `201 Created`
Successfully ingested indicators.

```json
{
  "ingested": 2,
  "ids": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ]
}
```

#### `400 Bad Request`
No indicators provided or validation error on the payload.

```json
{
  "error": "No indicators provided"
}
```

#### `401 Unauthorized`
Missing or invalid `x-api-key` header.

```json
{
  "error": "Unauthorized: Invalid or missing API key"
}
```

#### `413 Payload Too Large`
Payload exceeds the limit of 10,000 indicators.

```json
{
  "error": "Payload too large: maximum 10,000 indicators allowed"
}
```

---

## 2. List Threat Indicators

Retrieve paginated threat indicators with optional search and filtering criteria.

- **Method**: `GET`
- **Route Path**: `/api/v1/indicators`
- **Workflow Context**: Used by the frontend analyst dashboard table and external query scripts to browse, filter by severity or indicator type, and inspect telemetry records.

### Headers

| Header | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `x-api-key` | string | **Required** | Internal API authentication key |

### Query Parameters

| Parameter | Type | Required / Optional | Default | Description |
| --- | --- | --- | --- | --- |
| `search` | string | Optional | None | Substring search on indicator value (case-insensitive, max 256 characters) |
| `indicatorType` | string | Optional | None | Filter by indicator type (`IP`, `DOMAIN`, `URL`, `FILE_HASH_MD5`, `FILE_HASH_SHA256`, `EMAIL`, `CVE`) |
| `severity` | string | Optional | None | Filter by severity (`LOW`, `MED`, `MEDIUM`, `HIGH`, `CRITICAL`) |
| `minConfidence` | number | Optional | None | Minimum confidence score threshold (0–100) |
| `maxConfidence` | number | Optional | None | Maximum confidence score threshold (0–100) |
| `page` | number | Optional | `1` | Page number (min: 1) |
| `pageSize` | number | Optional | `20` | Number of items per page (min: 1, max: 100) |
| `sortBy` | string | Optional | `createdAt` | Sort column: `createdAt`, `confidenceScore`, `severity`, `indicatorValue` |
| `sortOrder` | string | Optional | `desc` | Sort direction: `asc`, `desc` |

### Responses

#### `200 OK`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "indicatorValue": "evil.example.com",
      "indicatorType": "DOMAIN",
      "severity": "HIGH",
      "confidenceScore": 88,
      "enrichmentSummary": "Observed hosting credential harvesting login portals.",
      "mitreTechniques": ["T1566.002", "T1071.001"],
      "rawPayload": {},
      "firstSeen": "2026-10-31T07:00:00.000Z",
      "lastSeen": "2026-10-31T07:00:00.000Z",
      "createdAt": "2026-10-31T07:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

#### `400 Bad Request`
Query parameter validation error (e.g. invalid type, out of range page size).

```json
{
  "error": "Validation Error",
  "details": [
    {
      "message": "Expected number, received nan",
      "path": ["page"]
    }
  ]
}
```

#### `401 Unauthorized`
Missing or invalid `x-api-key` header.

---

## 3. Get Threat Statistics Summary

Fetch aggregate counts, distribution by severity and type, and average confidence score across all ingested indicators.

- **Method**: `GET`
- **Route Path**: `/api/v1/indicators/stats/summary`
- **Workflow Context**: Used by the web analyst dashboard metrics cards. Responses are cached server-side for 10 seconds (`STATS_CACHE_TTL_MS = 10000`) with Promise memoization to protect against cache stampedes.

### Headers

| Header | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `x-api-key` | string | **Required** | Internal API authentication key |

### Query Parameters
*None.*

### Responses

#### `200 OK`

```json
{
  "totalCount": 1420,
  "countBySeverity": {
    "LOW": 600,
    "MEDIUM": 500,
    "HIGH": 250,
    "CRITICAL": 70
  },
  "countByType": {
    "IP": 800,
    "DOMAIN": 400,
    "URL": 150,
    "FILE_HASH_SHA256": 70
  },
  "averageConfidence": 64.2
}
```

#### `401 Unauthorized`
Missing or invalid `x-api-key` header.

---

## 4. Get Indicator Details

Retrieve complete details of an individual indicator by its UUID.

- **Method**: `GET`
- **Route Path**: `/api/v1/indicators/:id`
- **Workflow Context**: Used when an analyst clicks on an indicator in the UI to open the detailed drawer or modal, reviewing metadata, MITRE techniques, and enrichment summary.

### Headers

| Header | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `x-api-key` | string | **Required** | Internal API authentication key |

### Path Parameters

| Parameter | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `id` | string (UUID) | **Required** | UUID identifier of the threat indicator |

### Responses

#### `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "indicatorValue": "evil.example.com",
  "indicatorType": "DOMAIN",
  "severity": "HIGH",
  "confidenceScore": 88,
  "enrichmentSummary": "Observed hosting credential harvesting login portals.",
  "mitreTechniques": ["T1566.002", "T1071.001"],
  "rawPayload": {
    "asn": 13335
  },
  "firstSeen": "2026-10-31T07:00:00.000Z",
  "lastSeen": "2026-10-31T07:00:00.000Z",
  "createdAt": "2026-10-31T07:00:00.000Z"
}
```

#### `400 Bad Request`
Provided `:id` is not a valid UUID format.

```json
{
  "error": "Validation Error",
  "details": [
    {
      "message": "Invalid uuid",
      "path": ["id"]
    }
  ]
}
```

#### `401 Unauthorized`
Missing or invalid `x-api-key` header.

#### `404 Not Found`
Indicator with the specified UUID does not exist.

```json
{
  "error": "Indicator not found"
}
```

---

## 5. Enrich Threat Indicator

Trigger on-demand LLM intelligence enrichment for a specific threat indicator.

- **Method**: `POST`
- **Route Path**: `/api/v1/indicators/:id/enrich`
- **Workflow Context**: Invoked when an analyst clicks the "Enrich with AI" button in the indicator drawer. Calls OpenAI or Anthropic (configured via `LLM_PROVIDER`) to analyze the indicator, map to MITRE ATT&CK techniques, score confidence, and write a concise analyst brief.
- **Rate Limit**: Rate limited to 5 requests per 15-minute window per client IP.

### Headers

| Header | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `x-api-key` | string | **Required** | Internal API authentication key |

### Path Parameters

| Parameter | Type | Required / Optional | Description |
| --- | --- | --- | --- |
| `id` | string (UUID) | **Required** | UUID identifier of the threat indicator |

### Request Body
*None.*

### Responses

#### `200 OK`
Returns the updated threat indicator record.

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "indicatorValue": "evil.example.com",
  "indicatorType": "DOMAIN",
  "severity": "HIGH",
  "confidenceScore": 92,
  "enrichmentSummary": "Domain linked to known spearphishing campaigns targeting financial institutions.",
  "mitreTechniques": ["T1566.002"],
  "rawPayload": {},
  "firstSeen": "2026-10-31T07:00:00.000Z",
  "lastSeen": "2026-10-31T07:00:00.000Z",
  "createdAt": "2026-10-31T07:00:00.000Z"
}
```

#### `400 Bad Request`
Provided `:id` is not a valid UUID format.

#### `401 Unauthorized`
Missing or invalid `x-api-key` header.

#### `404 Not Found`
Indicator not found.

#### `429 Too Many Requests`
Rate limit exceeded for enrichment endpoint (max 5 requests per 15 minutes).

```json
{
  "message": "Too many requests, please try again later."
}
```

#### `500 Internal Server Error`
LLM provider API key missing or provider call failed after retries.
