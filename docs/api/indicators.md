# Indicators API Reference

The Indicators API provides endpoints for ingesting, querying, retrieving, and enriching threat intelligence indicators within the platform.

## Authentication

All endpoints under `/api/v1/` require an API key header for authentication:

| Header | Type | Description |
| :--- | :--- | :--- |
| `x-api-key` | String (**Required**) | Must match the configured `INTERNAL_API_KEY` on the server. |

---

## Endpoints

### 1. Ingest Threat Indicators

Ingests batch threat indicators in either JSON or CSV format.

* **HTTP Method**: `POST`
* **Route Path**: `/api/v1/ingest` (or `/api/v1/indicators/ingest`, `/api/v1/indicators`)

#### Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `x-api-key` | String | **Required** | Authentication key. |
| `Content-Type` | String | Optional | `application/json` (default) or `text/csv`. |

#### Request Body

##### JSON Format
```json
{
  "indicators": [
    {
      "value": "192.168.1.100",
      "type": "IP_ADDRESS",
      "source": "firewall-logs",
      "tags": ["malware", "c2"],
      "metadata": { "port": 443 },
      "rawPayload": { "log_id": "12345" }
    }
  ]
}
```

* `indicators`: Array of objects (**Required**, min 1, max 10,000).
  * `value`: String (**Required**, 1-2048 chars) - Indicator string (IP, domain, hash, URL, CVE, email).
  * `type`: Enum (**Required**) - One of `IP_ADDRESS`, `IP`, `DOMAIN`, `URL`, `SHA256`, `SHA1`, `MD5`, `EMAIL`, `CVE`.
  * `source`: String (Optional, max 256 chars) - Data source name.
  * `tags`: Array of Strings (Optional, max 100 items) - Associated threat tags.
  * `metadata`: Object (Optional) - Key-value metadata.
  * `rawPayload`: Object (Optional) - Unstructured raw payload.

##### CSV Format
Pass raw CSV string in body with `Content-Type: text/csv`:
```csv
value,type,source,tags
192.168.1.100,IP_ADDRESS,firewall-logs,malware;c2
phishing-domain.com,DOMAIN,email-gateway,phishing
```

#### Response Payloads

##### `201 Created`
```json
{
  "ingested": 2,
  "ids": [
    "9b1deb4d-3b7d-4142-9161-421118161000",
    "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  ]
}
```

##### `400 Bad Request`
```json
{
  "error": "No indicators provided"
}
```

##### `401 Unauthorized`
```json
{
  "error": "Unauthorized"
}
```

##### `413 Payload Too Large`
```json
{
  "error": "Payload too large: maximum 10,000 indicators allowed"
}
```

#### Practical Workflow Explanation
Used by automated threat ingestion feeds, SIEM integration pipelines, or analysts uploading batch CSV/JSON indicator reports to store indicators for analysis and monitoring.

---

### 2. List & Search Threat Indicators

Retrieves a paginated list of threat indicators with filtering, searching, and sorting options.

* **HTTP Method**: `GET`
* **Route Path**: `/api/v1/indicators`

#### Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `x-api-key` | String | **Required** | Authentication key. |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `search` | String | Optional | None | Substring search on `indicatorValue` (case-insensitive, max 256 chars). |
| `indicatorType` | Enum | Optional | None | Filter by type (`IP_ADDRESS`, `IP`, `DOMAIN`, `URL`, `SHA256`, `SHA1`, `MD5`, `EMAIL`, `CVE`). |
| `severity` | Enum | Optional | None | Filter by severity (`LOW`, `MED`, `MEDIUM`, `HIGH`, `CRITICAL`). |
| `minConfidence` | Number | Optional | None | Minimum confidence score (0-100). |
| `maxConfidence` | Number | Optional | None | Maximum confidence score (0-100). |
| `page` | Number | Optional | `1` | Page number (min 1). |
| `pageSize` | Number | Optional | `20` | Items per page (min 1, max 100). |
| `sortBy` | Enum | Optional | `createdAt` | Sort field (`createdAt`, `confidenceScore`, `severity`, `indicatorValue`). |
| `sortOrder` | Enum | Optional | `desc` | Sort direction (`asc`, `desc`). |

#### Response Payloads

##### `200 OK`
```json
{
  "data": [
    {
      "id": "9b1deb4d-3b7d-4142-9161-421118161000",
      "indicatorValue": "192.168.1.100",
      "indicatorType": "IP_ADDRESS",
      "severity": "HIGH",
      "confidenceScore": 85,
      "enrichmentSummary": "Observed in active brute force campaign against SSH.",
      "mitreTechniques": ["T1110", "T1078"],
      "rawPayload": {},
      "firstSeen": "2026-10-30T07:00:00.000Z",
      "lastSeen": "2026-10-30T07:00:00.000Z",
      "createdAt": "2026-10-30T07:00:00.000Z"
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

##### `400 Bad Request`
```json
{
  "error": "Validation error: ..."
}
```

##### `401 Unauthorized`
```json
{
  "error": "Unauthorized"
}
```

#### Practical Workflow Explanation
Powers the central threat intelligence table view in the web portal, allowing security analysts to filter by severity, search specific IPs or domains, and sort by highest confidence score.

---

### 3. Get Threat Indicator Summary Statistics

Retrieves global aggregation metrics across all threat indicators in the system.

* **HTTP Method**: `GET`
* **Route Path**: `/api/v1/indicators/stats/summary`

#### Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `x-api-key` | String | **Required** | Authentication key. |

#### Request Parameters
None.

#### Response Payloads

##### `200 OK`
```json
{
  "totalCount": 1250,
  "countBySeverity": {
    "LOW": 400,
    "MEDIUM": 500,
    "HIGH": 300,
    "CRITICAL": 50
  },
  "countByType": {
    "IP_ADDRESS": 600,
    "DOMAIN": 450,
    "SHA256": 200
  },
  "averageConfidence": 72.4
}
```

##### `401 Unauthorized`
```json
{
  "error": "Unauthorized"
}
```

#### Practical Workflow Explanation
Polled periodically by dashboard header cards to display real-time summary statistics. Includes a 10-second TTL cache with single-flight promise memoization to optimize database load.

---

### 4. Get Indicator Details by ID

Retrieves details for a specific threat indicator by its unique identifier.

* **HTTP Method**: `GET`
* **Route Path**: `/api/v1/indicators/:id`

#### Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `x-api-key` | String | **Required** | Authentication key. |

#### Path Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | **Required** | Valid UUID string of the indicator. |

#### Response Payloads

##### `200 OK`
```json
{
  "id": "9b1deb4d-3b7d-4142-9161-421118161000",
  "indicatorValue": "192.168.1.100",
  "indicatorType": "IP_ADDRESS",
  "severity": "HIGH",
  "confidenceScore": 85,
  "enrichmentSummary": "Observed in active brute force campaign against SSH.",
  "mitreTechniques": ["T1110", "T1078"],
  "rawPayload": {},
  "firstSeen": "2026-10-30T07:00:00.000Z",
  "lastSeen": "2026-10-30T07:00:00.000Z",
  "createdAt": "2026-10-30T07:00:00.000Z"
}
```

##### `400 Bad Request`
```json
{
  "error": "Validation error: Invalid UUID"
}
```

##### `404 Not Found`
```json
{
  "error": "Indicator not found"
}
```

##### `401 Unauthorized`
```json
{
  "error": "Unauthorized"
}
```

#### Practical Workflow Explanation
Used when an analyst clicks on an indicator row in the web application to open the detail drawer and inspect associated MITRE ATT&CK techniques, raw payload, and intelligence notes.

---

### 5. Enrich Indicator on Demand

Triggers automated AI/LLM enrichment for a specific threat indicator using OpenAI or Anthropic.

* **HTTP Method**: `POST`
* **Route Path**: `/api/v1/indicators/:id/enrich`

#### Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `x-api-key` | String | **Required** | Authentication key. |

#### Path Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | **Required** | Valid UUID string of the indicator to enrich. |

#### Response Payloads

##### `200 OK`
```json
{
  "id": "9b1deb4d-3b7d-4142-9161-421118161000",
  "indicatorValue": "192.168.1.100",
  "indicatorType": "IP_ADDRESS",
  "severity": "CRITICAL",
  "confidenceScore": 92,
  "enrichmentSummary": "High-confidence IP address associated with Cobalt Strike C2 infrastructure.",
  "mitreTechniques": ["T1071.001", "T1573"],
  "rawPayload": {},
  "firstSeen": "2026-10-30T07:00:00.000Z",
  "lastSeen": "2026-10-30T07:00:00.000Z",
  "createdAt": "2026-10-30T07:00:00.000Z"
}
```

##### `400 Bad Request`
```json
{
  "error": "Validation error: Invalid UUID"
}
```

##### `404 Not Found`
```json
{
  "error": "Indicator not found"
}
```

##### `429 Too Many Requests`
```json
{
  "message": "Too many requests, please try again later."
}
```

##### `500 Internal Server Error`
```json
{
  "error": "Enrichment service unavailable"
}
```

#### Practical Workflow Explanation
Triggered on-demand when an analyst clicks "Enrich Indicator" in the drawer view. Runs structured LLM prompts against OpenAI or Anthropic to update the severity rating, confidence score, MITRE ATT&CK technique IDs, and analyst intelligence summary.
