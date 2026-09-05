## 2026-09-05 - Information Leakage in Global Error Handler
**Vulnerability:** The Express global error handler was exposing raw `err.message` to the client for all errors, including 500 Internal Server Errors in production.
**Learning:** Default error handlers in Express often leak sensitive details (like stack traces or underlying service failures bubbled up into `err.message`) if not explicitly sanitized based on the environment.
**Prevention:** Always check `process.env.NODE_ENV !== 'production'` and conditionally obscure error messages for 500 status codes, returning a generic message to the client while logging the full error securely on the server.
