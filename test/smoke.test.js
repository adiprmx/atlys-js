/**
 * Smoke tests using only demo endpoints (no API key needed).
 * Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Atlys, AtlysError, AuthError, RateLimitError, NetworkError } from "../src/index.js";

test("exports are present", () => {
  assert.ok(Atlys, "Atlys class exported");
  assert.ok(AtlysError, "AtlysError exported");
  assert.ok(typeof Atlys.demo === "function", "Atlys.demo factory exists");
});

test("demo client maps paths to /v1/demo/", () => {
  const c = Atlys.demo();
  assert.equal(c._path("/v1/info/news"), "/v1/demo/info/news");
  assert.equal(c.demo, true);
});

test("keyed client keeps paths as-is", () => {
  const c = new Atlys("aclys_test");
  assert.equal(c._path("/v1/info/news"), "/v1/info/news");
  assert.equal(c.demo, false);
});

test("demo news endpoint returns PRD shape", async () => {
  const c = Atlys.demo();
  const r = await c.info.news({ limit: 2 });
  assert.equal(r.status, "ok");
  assert.equal(r.creator, "Atlys");
  assert.ok(r.result, "has result");
  assert.ok(r.meta, "has meta");
});

test("generic get works for any path", async () => {
  const c = Atlys.demo();
  const r = await c.get("/v1/demo/info/hn", { limit: 1 });
  assert.equal(r.status, "ok");
});

test("invalid key throws AuthError", async () => {
  const c = new Atlys("aclys_invalid_key_123", { autoRetry: false });
  await assert.rejects(() => c.info.news(), AuthError);
});

test("error classes carry fields", () => {
  const e = new RateLimitError(42, "req-1");
  assert.equal(e.retryAfter, 42);
  assert.equal(e.requestId, "req-1");
  assert.equal(e.httpStatus, 429);
  assert.ok(e instanceof AtlysError);
  assert.ok(new NetworkError("x") instanceof AtlysError);
});
