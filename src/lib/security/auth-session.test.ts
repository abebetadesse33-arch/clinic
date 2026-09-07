import test from "node:test";
import assert from "node:assert/strict";

import { isAuthorizedForRole } from "./auth-session";

test("allows matching clinician role", () => {
  assert.equal(isAuthorizedForRole("physician", ["physician", "nurse_practitioner", "nurse"]), true);
});

test("rejects non-matching role", () => {
  assert.equal(isAuthorizedForRole("patient", ["physician", "nurse_practitioner", "nurse"]), false);
});

test("handles empty allow list safely", () => {
  assert.equal(isAuthorizedForRole("physician", []), false);
});
