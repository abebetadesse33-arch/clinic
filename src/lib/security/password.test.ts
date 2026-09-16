import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { hashPassword, verifyPassword } from "./password";

test("hashes are salted scrypt and verify", async () => {
  const a = await hashPassword("correct horse");
  const b = await hashPassword("correct horse");
  assert.ok(a.startsWith("scrypt$"));
  assert.notEqual(a, b, "salt must differ per hash");
  assert.deepEqual(await verifyPassword("correct horse", a), { ok: true, needsRehash: false });
  assert.deepEqual(await verifyPassword("wrong", a), { ok: false, needsRehash: false });
});

test("legacy sha256 hashes verify and request a rehash", async () => {
  const legacy = createHash("sha256").update("123456", "utf8").digest("hex");
  assert.deepEqual(await verifyPassword("123456", legacy), { ok: true, needsRehash: true });
  assert.deepEqual(await verifyPassword("654321", legacy), { ok: false, needsRehash: false });
});

test("the stored hash itself is not accepted as the password", async () => {
  const legacy = createHash("sha256").update("123456", "utf8").digest("hex");
  assert.equal((await verifyPassword(legacy, legacy)).ok, false);
  const modern = await hashPassword("123456");
  assert.equal((await verifyPassword(modern, modern)).ok, false);
});

test("missing or malformed stored hashes never verify", async () => {
  assert.equal((await verifyPassword("anything", null)).ok, false);
  assert.equal((await verifyPassword("anything", "")).ok, false);
  assert.equal((await verifyPassword("anything", "scrypt$bad")).ok, false);
  assert.equal((await verifyPassword("anything", "plaintext-password")).ok, false);
});
