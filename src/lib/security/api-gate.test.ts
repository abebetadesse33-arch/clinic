import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { middleware } from "../../middleware";

const COOKIE = `Nini_session=${"a".repeat(48)}`;

function call(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return middleware(new NextRequest(`https://clinic.test${path}`, init));
}

test("API requests without a session cookie are rejected", async () => {
  for (const path of ["/api/v1/hr/payroll", "/api/v1/hr/payroll/", "/api/v1/fhir/Patient", "/health/api/v1/hr/payroll/"]) {
    const res = call(path);
    assert.equal(res.status, 401, path);
    assert.equal((await res.json()).success, false);
  }
});

test("a client cannot bypass the gate with the internal rewrite header", () => {
  const res = call("/api/v1/hr/payroll", { headers: { "x-wisdomcourse-internal-rewrite": "1" } });
  assert.equal(res.status, 401);
});

test("a request carrying a session cookie passes the gate", () => {
  const res = call("/api/v1/hr/payroll", { headers: { cookie: COOKIE } });
  assert.notEqual(res.status, 401);
});

test("a malformed session cookie does not pass the gate", () => {
  const res = call("/api/v1/hr/payroll", { headers: { cookie: "Nini_session=short" } });
  assert.equal(res.status, 401);
});

test("sign-in, registration and webhooks stay reachable without a session", () => {
  for (const [path, method] of [
    ["/api/v1/auth/signin", "POST"],
    ["/api/v1/auth/send-otp", "POST"],
    ["/api/v1/public/register/submit", "POST"],
    ["/api/v1/telegram/webhook", "POST"],
    ["/api/v1/system/health", "GET"],
    ["/api/v1/treat-me-now/start", "POST"],
  ] as const) {
    assert.notEqual(call(path, { method }).status, 401, path);
  }
});

test("a prefix lookalike of a public route is not public", () => {
  assert.equal(call("/api/v1/auth/signin-admin-bypass", { method: "POST" }).status, 401);
  assert.equal(call("/api/v1/publicity").status, 401);
});

test("public website content is read-only without a session", () => {
  assert.notEqual(call("/api/v1/landing-sections").status, 401);
  assert.equal(call("/api/v1/landing-sections", { method: "POST" }).status, 401);
});

test("the waiting-room heartbeat reaches its route, which checks the body token itself", () => {
  assert.notEqual(call("/api/v1/display/waiting-room/heartbeat", { method: "POST" }).status, 401);
  assert.notEqual(call("/health/api/v1/display/waiting-room/heartbeat/", { method: "POST" }).status, 401);
});

test("waiting-room screens may present a display token instead of a session", () => {
  assert.equal(call("/api/v1/display/waiting-room/state").status, 401);
  assert.notEqual(call("/api/v1/display/waiting-room/state?token=disp_abc").status, 401);
  assert.notEqual(
    call("/api/v1/display/waiting-room/state", { headers: { "x-display-token": "disp_abc" } }).status,
    401
  );
});
