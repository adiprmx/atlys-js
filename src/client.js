/**
 * Core HTTP client for the Atlys API.
 * Works in Node.js 18+ and modern browsers (uses global fetch).
 */
import { AtlysError, AuthError, RateLimitError, NetworkError } from "./errors.js";

const DEFAULT_BASE_URL = "https://api.atlys.my.id";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(params) {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qs.append(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export class Atlys {
  /**
   * @param {string|null} [apiKey] - your Atlys API key (format atlys_...). Omit for demo mode.
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

    // resource namespaces (lazy-bound to this client)
    const bind = (Resource) => new Resource(this);
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
    return new Atlys(null, { ...options, demo: true });
  }

  _path(path) {
    let p = path.startsWith("/") ? path : `/${path}`;
    if (this.demo && !p.startsWith("/v1/demo/")) {
      // map /v1/<kategori>/<endpoint> -> /v1/demo/<kategori>/<endpoint>
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
        body: body !== null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
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

    // rate limit: auto-retry with backoff, respecting retry-after
    if (res.status === 429 && this.autoRetry && attempt < MAX_RETRIES) {
      const retryAfter = Math.max(1, parseInt(res.headers.get("retry-after") || "60", 10) || 60);
      await sleep(Math.min(retryAfter, 120) * 1000);
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
        (payload.error && payload.error.message) || "invalid or missing api key",
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
}

// ---- resource namespaces (helpers for popular endpoints) ----

class Resource {
  constructor(client) {
    this._c = client;
  }
}

class Info extends Resource {
  /** Latest scraped news. */
  news(params = {}) { return this._c.get("/v1/info/news", params); }
  /** Latest Hacker News items. */
  hn(params = {}) { return this._c.get("/v1/info/hn", params); }
  /** News sources being scraped. */
  sources() { return this._c.get("/v1/info/sources"); }
}

class Islami extends Resource {
  /** Prayer times. params: {kota, tanggal} */
  jadwalSholat(params = {}) { return this._c.get("/v1/islami/jadwal-sholat", params); }
  /** Quran verses. params: {surah, ayat} */
  quran(params = {}) { return this._c.get("/v1/islami/quran", params); }
}

class Tools extends Resource {
  /** Generate a QR code. params: {teks} */
  qr(params = {}) { return this._c.get("/v1/tools/qr", params); }
  /** Shorten a URL. params: {url} */
  shortlink(params = {}) { return this._c.post("/v1/tools/shortlink", params); }
  /** Inspect HTTP headers of a URL. params: {url} */
  cekHeader(params = {}) { return this._c.get("/v1/tools/cek-header", params); }
  /** Extract readable content from a URL. params: {url} */
  extract(params = {}) { return this._c.get("/v1/tools/extract", params); }
}

class Fun extends Resource {
  /** Random quote. */
  quoteRandom() { return this._c.get("/v1/fun/quote-random"); }
}

class Data extends Resource {
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
}

class Osint extends Resource {
  /** DNS lookup. params: {domain} */
  dns(params = {}) { return this._c.get("/v1/osint/dns", params); }
  /** WHOIS lookup. params: {domain} */
  whois(params = {}) { return this._c.get("/v1/osint/whois", params); }
}

class Downloader extends Resource {
  /** TikTok video info/download. params: {url} */
  tiktok(params = {}) { return this._c.get("/v1/downloader/tiktok", params); }
}
