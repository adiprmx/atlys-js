/**
 * Typed errors for the Atlys SDK.
 */

/** Base error for every API-level failure. */
export class AtlysError extends Error {
  /**
   * @param {string} code - machine-readable error code from the API
   * @param {string} message - human-readable message
   * @param {string|null} [requestId] - request id from meta, if present
   * @param {number|null} [httpStatus] - raw HTTP status code
   */
  constructor(code, message, requestId = null, httpStatus = null) {
    super(message);
    this.name = "AtlysError";
    this.code = code;
    this.requestId = requestId;
    this.httpStatus = httpStatus;
  }
}

/** Thrown when the API key is missing or rejected (HTTP 401). */
export class AuthError extends AtlysError {
  constructor(message = "invalid or missing api key", requestId = null) {
    super("unauthorized", message, requestId, 401);
    this.name = "AuthError";
  }
}

/** Thrown when the rate limit is hit (HTTP 429). */
export class RateLimitError extends AtlysError {
  /**
   * @param {number} retryAfter - seconds to wait before retrying
   * @param {string|null} [requestId]
   */
  constructor(retryAfter = 60, requestId = null) {
    super("rate_limited", `rate limit exceeded, retry after ${retryAfter}s`, requestId, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Thrown for network problems, timeouts, and non-JSON responses. */
export class NetworkError extends AtlysError {
  constructor(message, cause = null) {
    super("network_error", message, null, null);
    this.name = "NetworkError";
    this.cause = cause;
  }
}
