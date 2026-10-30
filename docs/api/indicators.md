# Threat Telemetry API Reference

All requests to the Threat Telemetry API must include authentication headers and adhere to rate limits.

---

## Authentication

All API endpoints under `/api/v1/` require an API key passed in the request header:

| Header Name | Type | Description | Required |
| --- | --- | --- | --- |
| `x-api-key` | `string` | Secret internal key matching configured `INTERNAL_API_KEY`. | **Required** |

Requests missing or presenting an invalid `x-api-key` will receive a `401 Unauthorized` or `403 Forbidden` error response.

---

## Endpoints

### 1. Ingest Threat Indicators

Ingest raw threat intelligence indicators in JSON or CSV format for queueing and database persistence.

- **HTTP Method:** `POST`
- **Route Path:** `/api/v1/ingest` (or `/api/v1/indicators/ingest`)
- **Rate Limit:** 100 requests per 15-minute window per IP (Global API limiter)

#### Request Headers
| Header Name | Type | Description | Required |
| --- | --- | --- | --- |
| `x-api-key` | `string` | Authentication API key. | **Required** |
| `Content-Type` | `string` | `application/json` or `text/csv`. | **Required** |

#### Request Body
- **JSON Payload (`application/json`):**
  ```json
  {
    "indicators": [
      {
        "value": "192.168.1.1",
        "type": "IP",
        "rawPayload": { "source": "firewall-logs" }
      }
    ]
  }
  ```
- **CSV Payload (`text/csv`):**
  Raw string payload where each line represents an indicator (e.g. `IP,192.168.1.1`).

*Note:* Maximum bulk batch limit is 10,000 indicators per payload.

#### Responses

- **`201 Created`**
  ```json
  {
    "ingested": 1,
    "ids": [
      "c56a4180-65aa-42ec-a945-5fd21dec0538"
    ]
  }
  ```
- **`400 Bad Request`**: Missing payload or invalid schema.
- **`413 Payload Too Large`**: Exceeds maximum 10,000 indicator limit.

#### Workflow Usage
Security pipelines and log collectors use this endpoint to send continuous batches of raw threat indicators into the system.

---

### 2. Search & Filter Indicators

Query and filter persisted threat indicators with pagination and sorting support.

- **HTTP Method:** `GET`
- **Route Path:** `/api/v1/indicators`
- **Rate Limit:** 100 requests per 15-minute window per IP

#### Request Headers
| Header Name | Type | Description | Required |
| --- | --- | --- | --- |
| `x-api-key` | `string` | Authentication API key. | **Required** |

#### Query Parameters
| Parameter | Type | Default | Description | Required/Optional |
| --- | --- | --- | --- | --- |
| `search` | `string` | `undefined` | Substring search on indicator value. | Optional |
| `indicatorType` | `string` | `undefined` | Filter by indicator type (`IP`, `DOMAIN`, `URL`, `HASH`). | Optional |
| `severity` | `string` | `undefined` | Filter by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). | Optional |
| `minConfidence` | `number` | `undefined` | Minimum confidence score threshold (0-100). | Optional |
| `maxConfidence` | `number` | `undefined` | Maximum confidence score threshold (0-100). | Optional |
| `page` | `integer` | `1` | Page number for pagination. | Optional |
| `pageSize` | `integer` | `20` | Items per page (max 100). | Optional |
| `sortBy` | `string` | `'createdAt'` | Field to sort by (`createdAt`, `confidenceScore`, `severity`, `indicatorValue`). | Optional |
| `sortOrder` | `string` | `'desc'` | Sort direction (`asc` or `desc`). | Optional |

#### Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
      "indicatorValue": "192.168.1.1",
      "indicatorType": "IP",
      "severity": "LOW",
      "confidenceScore": 0,
      "mitreTechniques": [],
      "rawPayload": {},
      "createdAt": "2026-10-30T07:00:00.000Z",
      "updatedAt": "2026-10-30T07:00:00.000Z"
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

#### Workflow Usage
Analyst dashboards use this endpoint to dynamically search, filter, and paginate threat intelligence lists.

---

### 3. Get Summary Statistics

Retrieve aggregate metrics including total counts, distributions by severity and type, and average confidence scores.

- **HTTP Method:** `GET`
- **Route Path:** `/api/v1/indicators/stats/summary`
- **Rate Limit:** Cached server-side with a 10-second TTL to avoid database CPU spikes under frequent dashboard polling.

#### Request Headers
| Header Name | Type | Description | Required |
| --- | --- | --- | --- |
| `x-api-key` | `string` | Authentication API key. | **Required** |

#### Response (`200 OK`)
```json
{
  "totalCount": 150,
  "countBySeverity": {
    "LOW": 100,
    "MEDIUM": 30,
    "HIGH": 15,
    "CRITICAL": 5
  },
  "countByType": {
    "IP": 80,
    "DOMAIN": 40,
    "HASH": 30
  },
  "averageConfidence": 68.5
}
```

#### Workflow Usage
Renders main KPI cards and overview charts on the executive security analyst workspace.

---

### 4. Get Indicator Details

Fetch full record details for a single threat indicator by unique ID.

- **HTTP Method:** `GET`
- **Route Path:** `/api/v1/indicators/:id`

#### Request Headers
| Header Name | Type | Description | Required |
| --- | --- | --- | --- |
| `x-api-key` | `string` | Authentication API key. | **Required** |

#### Path Parameters
| Parameter | Type | Description | Required/Optional |
| --- | --- | --- | --- |
| `id` | `string (UUID)` | Unique identifier of the indicator. | **Required** |

#### Responses
- **`200 OK`**
  ```json
  {
    "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "indicatorValue": "192.168.1.1",
    "indicatorType": "IP",
    "severity": "HIGH",
    "confidenceScore": 85,
    "mitreTechniques": ["T1071.001"],
    "enrichmentSummary": "Suspicious activity detected.",
    "rawPayload": {},
    "createdAt": "2026-10-30T07:00:00.000Z",
    "updatedAt": "2026-10-30T07:05:00.000Z"
  }
  ```
- **`404 Not Found`**: Indicator ID does not exist.

#### Workflow Usage
Populates indicator detail panels and investigation drawers in the frontend UI.

---

### 5. Enrich Indicator with LLM Intelligence

Trigger automated enrichment of an indicator using configured LLM providers (OpenAI or Anthropic). Updates severity, confidence score, MITRE ATT&CK techniques, and analyst brief summary.

- **HTTP Method:** `POST`
- **Route Path:** `/api/v1/indicators/:id/enrich`
- **Rate Limit:** Strict route limit of 5 requests per 15 minutes per IP.

#### Request Headers
| Header Name | Type | Description | Required |
| --- | --- | --- | --- |
| `x-api-key` | `string` | Authentication API key. | **Required** |

#### Path Parameters
| Parameter | Type | Description | Required/Optional |
| --- | --- | --- | --- |
| `id` | `string (UUID)` | Unique identifier of the indicator to enrich. | **Required** |

#### Response (`200 OK`)
```json
{
  "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "indicatorValue": "192.168.1.1",
  "indicatorType": "IP",
  "severity": "HIGH",
  "confidenceScore": 90,
  "mitreTechniques": ["T1071.001", "T1090"],
  "enrichmentSummary": "Host identified as active command and control node.",
  "rawPayload": {},
  "createdAt": "2026-10-30T07:00:00.000Z",
  "updatedAt": "2026-10-30T07:10:00.000Z"
}
```

#### Errors
- **`404 Not Found`**: Indicator ID does not exist.
- **`429 Too Many Requests`**: Enrichment rate limit exceeded.
- **`500 Internal Server Error`**: LLM API key unconfigured or service failure.

#### Workflow Usage
Allows analysts to trigger on-demand AI analysis to generate intelligence briefs and MITRE ATT&CK mappings.
