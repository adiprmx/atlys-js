var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  Atlys: () => Atlys,
  AtlysError: () => AtlysError,
  AuthError: () => AuthError,
  NetworkError: () => NetworkError,
  RateLimitError: () => RateLimitError
});
module.exports = __toCommonJS(index_exports);

// src/errors.js
var AtlysError = class extends Error {
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
};
var AuthError = class extends AtlysError {
  constructor(message = "invalid or missing api key", requestId = null) {
    super("unauthorized", message, requestId, 401);
    this.name = "AuthError";
  }
};
var RateLimitError = class extends AtlysError {
  /**
   * @param {number} retryAfter - seconds to wait before retrying
   * @param {string|null} [requestId]
   */
  constructor(retryAfter = 60, requestId = null) {
    super("rate_limited", `rate limit exceeded, retry after ${retryAfter}s`, requestId, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
};
var NetworkError = class extends AtlysError {
  constructor(message, cause = null) {
    super("network_error", message, null, null);
    this.name = "NetworkError";
    this.cause = cause;
  }
};

// src/client.js
var DEFAULT_BASE_URL = "https://api.atlys.my.id";
var DEFAULT_TIMEOUT_MS = 3e4;
var MAX_RETRIES = 3;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function buildQuery(params) {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === void 0 || v === null) continue;
    qs.append(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
var Atlys = class _Atlys {
  /**
   * @param {string|null} [apiKey] - your Atlys API key (format aclys_...). Omit for demo mode.
   * @param {object} [options]
   * @param {string} [options.baseUrl] - override API base URL
   * @param {number} [options.timeout] - request timeout in ms (default 30000)
   * @param {boolean} [options.autoRetry] - auto-retry on 429 with backoff (default true)
   * @param {boolean} [options.demo] - force demo mode (prefixes paths with /v1/demo)
   */
  constructor(apiKey = null, options = {}) {
    this.apiKey = apiKey || null;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout || DEFAULT_TIMEOUT_MS;
    this.autoRetry = options.autoRetry !== false;
    this.demo = Boolean(options.demo) || !this.apiKey;
    const bind = (Resource2) => new Resource2(this);
    this.info = bind(Info);
    this.islami = bind(Islami);
    this.tools = bind(Tools);
    this.fun = bind(Fun);
    this.data = bind(Data);
    this.osint = bind(Osint);
    this.downloader = bind(Downloader);
  }
  /** Create a demo-mode client (no key needed, demo data only). */
  static demo(options = {}) {
    return new _Atlys(null, { ...options, demo: true });
  }
  _path(path) {
    let p = path.startsWith("/") ? path : `/${path}`;
    if (this.demo && !p.startsWith("/v1/demo/")) {
      p = p.replace(/^\/v1\//, "/v1/demo/");
    }
    return p;
  }
  /**
   * Generic GET for any of the 100.000 endpoints.
   * @param {string} path - e.g. "/v1/info/news" or "/v1/data/kodepos/kelurahan/menteng"
   * @param {object} [params] - query string parameters
   * @returns {Promise<object>} the parsed PRD response {status, creator, result, meta}
   */
  async get(path, params = null) {
    return this._request("GET", this._path(path), params);
  }
  /**
   * Generic POST.
   * @param {string} path
   * @param {object} [body] - JSON body
   * @param {object} [params] - query string parameters
   */
  async post(path, body = null, params = null) {
    return this._request("POST", this._path(path), params, body);
  }
  async _request(method, path, params = null, body = null, attempt = 0) {
    const url = `${this.baseUrl}${path}${buildQuery(params)}`;
    const headers = { "user-agent": "atlys-js/0.1.0" };
    if (this.apiKey) headers["x-api-key"] = this.apiKey;
    if (body !== null) headers["content-type"] = "application/json";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : void 0,
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timer);
      throw new NetworkError(
        err && err.name === "AbortError" ? `request timed out after ${this.timeout}ms` : `network error: ${err.message}`,
        err
      );
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 429 && this.autoRetry && attempt < MAX_RETRIES) {
      const retryAfter = Math.max(1, parseInt(res.headers.get("retry-after") || "60", 10) || 60);
      await sleep(Math.min(retryAfter, 120) * 1e3);
      return this._request(method, path, params, body, attempt + 1);
    }
    let payload = null;
    try {
      payload = await res.json();
    } catch (_) {
      throw new NetworkError(`expected JSON response, got HTTP ${res.status}`);
    }
    if (res.status === 401) {
      throw new AuthError(
        payload.error && payload.error.message || "invalid or missing api key",
        payload.meta && payload.meta.request_id
      );
    }
    if (res.status === 429) {
      throw new RateLimitError(
        Math.max(1, parseInt(res.headers.get("retry-after") || "60", 10) || 60),
        payload.meta && payload.meta.request_id
      );
    }
    if (payload.status === "error" || !res.ok) {
      const e = payload.error || {};
      throw new AtlysError(
        e.code || `http_${res.status}`,
        e.message || `request failed with HTTP ${res.status}`,
        payload.meta && payload.meta.request_id,
        res.status
      );
    }
    return payload;
  }
};
var Resource = class {
  constructor(client) {
    this._c = client;
  }
};
var Info = class extends Resource {
  /** Latest scraped news. */
  news(params = {}) {
    return this._c.get("/v1/info/news", params);
  }
  /** Latest Hacker News items. */
  hn(params = {}) {
    return this._c.get("/v1/info/hn", params);
  }
  /** News sources being scraped. */
  sources() {
    return this._c.get("/v1/info/sources");
  }
};
var Islami = class extends Resource {
  /** Prayer times. params: {kota, tanggal} */
  jadwalSholat(params = {}) {
    return this._c.get("/v1/islami/jadwal-sholat", params);
  }
  /** Quran verses. params: {surah, ayat} */
  quran(params = {}) {
    return this._c.get("/v1/islami/quran", params);
  }
};
var Tools = class extends Resource {
  /** Generate a QR code. params: {teks} */
  qr(params = {}) {
    return this._c.get("/v1/tools/qr", params);
  }
  /** Shorten a URL. params: {url} */
  shortlink(params = {}) {
    return this._c.post("/v1/tools/shortlink", params);
  }
  /** Inspect HTTP headers of a URL. params: {url} */
  cekHeader(params = {}) {
    return this._c.get("/v1/tools/cek-header", params);
  }
  /** Extract readable content from a URL. params: {url} */
  extract(params = {}) {
    return this._c.get("/v1/tools/extract", params);
  }
};
var Fun = class extends Resource {
  /** Random quote. */
  quoteRandom() {
    return this._c.get("/v1/fun/quote-random");
  }
};
var Data = class extends Resource {
  /** Postal codes by subdistrict slug, e.g. "gambir". */
  kodeposKecamatan(slug, params = {}) {
    return this._c.get(`/v1/data/kodepos/kecamatan/${encodeURIComponent(slug)}`, params);
  }
  /** Postal codes by village slug, e.g. "menteng". */
  kodeposKelurahan(slug, params = {}) {
    return this._c.get(`/v1/data/kodepos/kelurahan/${encodeURIComponent(slug)}`, params);
  }
  /** Region data by subdistrict slug. */
  wilayahKecamatan(slug, params = {}) {
    return this._c.get(`/v1/data/wilayah/kecamatan/${encodeURIComponent(slug)}`, params);
  }
  /** Region data by city slug. */
  wilayahKota(slug, params = {}) {
    return this._c.get(`/v1/data/wilayah/kota/${encodeURIComponent(slug)}`, params);
  }
};
var Osint = class extends Resource {
  /** DNS lookup. params: {domain} */
  dns(params = {}) {
    return this._c.get("/v1/osint/dns", params);
  }
  /** WHOIS lookup. params: {domain} */
  whois(params = {}) {
    return this._c.get("/v1/osint/whois", params);
  }
};
var Downloader = class extends Resource {
  /** TikTok video info/download. params: {url} */
  tiktok(params = {}) {
    return this._c.get("/v1/downloader/tiktok", params);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Atlys,
  AtlysError,
  AuthError,
  NetworkError,
  RateLimitError
});
