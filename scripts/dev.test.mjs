import assert from "node:assert/strict";
import { test } from "node:test";
import { developmentEnvironment } from "./dev.mjs";

for (const [frontend, backend] of [["3027", "30027"], ["3000", "3001"]]) {
  test(`derives both applications' settings from ${frontend}/${backend}`, () => {
    const settings = { FRONTEND_PORT: frontend, BACKEND_PORT: backend };
    const environment = {
      PORT: "9999",
      BACKEND_INTERNAL_URL: "http://localhost:9999",
      CORS_ORIGINS: "http://localhost:9999",
      ADMIN_PASSWORD_RESET_URL: "http://painel.localhost:9999/en/reset-password",
    };
    const fe = developmentEnvironment("frontend", settings, environment);
    const be = developmentEnvironment("backend", settings, environment);
    assert.equal(fe.PORT, frontend);
    assert.equal(fe.BACKEND_INTERNAL_URL, `http://localhost:${backend}`);
    assert.equal(be.PORT, backend);
    assert.equal(be.CORS_ORIGINS, `http://localhost:${frontend}`);
    assert.equal(be.ADMIN_PASSWORD_RESET_URL, `http://painel.localhost:${frontend}/en/reset-password`);
    assert.equal(environment.PORT, "9999");
  });
}

for (const host of ["localhost", "painel.localhost", "gestao.localhost"]) {
  test(`moves the local recovery URL on ${host} to the frontend port without naming an area`, () => {
    const result = developmentEnvironment("backend", { FRONTEND_PORT: "3027", BACKEND_PORT: "30027" }, {
      ADMIN_PASSWORD_RESET_URL: `http://${host}:9999/pt/redefinir-senha`,
    });
    assert.equal(result.ADMIN_PASSWORD_RESET_URL, `http://${host}:3027/pt/redefinir-senha`);
  });
}

test("leaves look-alike hosts outside .localhost untouched", () => {
  const value = "https://painel.localhost.example.org/pt/redefinir-senha";
  const result = developmentEnvironment("backend", { FRONTEND_PORT: "3027", BACKEND_PORT: "30027" }, { ADMIN_PASSWORD_RESET_URL: value });
  assert.equal(result.ADMIN_PASSWORD_RESET_URL, value);
});

test("preserves nonlocal recovery URLs and unrelated environment settings", () => {
  const environment = {
    ADMIN_PASSWORD_RESET_URL: "https://painel.example.org/en/reset-password",
    PLATFORM_DOMAIN: "localhost",
  };
  const result = developmentEnvironment("backend", {
    FRONTEND_PORT: "3027", BACKEND_PORT: "30027",
  }, environment);
  assert.equal(result.ADMIN_PASSWORD_RESET_URL, environment.ADMIN_PASSWORD_RESET_URL);
  assert.equal(result.PLATFORM_DOMAIN, "localhost");
});

for (const value of [undefined, "", "0", "-1", "300271", "1.5", "abc"]) {
  for (const key of ["FRONTEND_PORT", "BACKEND_PORT"]) {
    test(`rejects invalid ${key}: ${value}`, () => {
      assert.throws(() => developmentEnvironment("frontend", {
        FRONTEND_PORT: "3027", BACKEND_PORT: "30027", [key]: value,
      }, {}), new RegExp(key));
    });
  }
}

test("rejects conflicting ports, production mode, invalid application and recovery URL", () => {
  const settings = { FRONTEND_PORT: "3027", BACKEND_PORT: "30027" };
  assert.throws(() => developmentEnvironment("frontend", {
    ...settings, BACKEND_PORT: "3027",
  }, {}), /must be different/);
  assert.throws(() => developmentEnvironment("frontend", settings, {
    NODE_ENV: "production",
  }), /NODE_ENV/);
  assert.throws(() => developmentEnvironment("unknown", settings, {}), /frontend or backend/);
  assert.throws(() => developmentEnvironment("backend", settings, {
    ADMIN_PASSWORD_RESET_URL: "invalid",
  }), /Invalid ADMIN_PASSWORD_RESET_URL/);
});
