import test from "node:test";
import assert from "node:assert/strict";

import { rateLimit, resetRateLimit } from "./rate-limit";

test("rateLimit allows up to the limit and then blocks with a retry hint", () => {
  const key = `test:${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 60_000).allowed, true);
  const blocked = rateLimit(key, 3, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});

test("rateLimit tracks keys independently and can be reset", () => {
  const a = `test:a:${Math.random()}`;
  const b = `test:b:${Math.random()}`;
  rateLimit(a, 1, 60_000);
  assert.equal(rateLimit(a, 1, 60_000).allowed, false);
  assert.equal(rateLimit(b, 1, 60_000).allowed, true);
  resetRateLimit(a);
  assert.equal(rateLimit(a, 1, 60_000).allowed, true);
});

test("rateLimit starts a fresh window once the previous one expires", async () => {
  const key = `test:expire:${Math.random()}`;
  rateLimit(key, 1, 20);
  assert.equal(rateLimit(key, 1, 20).allowed, false);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(rateLimit(key, 1, 20).allowed, true);
});
