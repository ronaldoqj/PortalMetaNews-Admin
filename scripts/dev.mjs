import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { watchDocs } from "./sync-docs.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

function port(settings, key) {
  const value = settings[key];
  if (!/^\d+$/.test(value ?? "") || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${key} must be an integer between 1 and 65535.`);
  }
  return String(Number(value));
}

export function developmentEnvironment(application, settings, environment) {
  if (!["frontend", "backend"].includes(application)) {
    throw new Error("Expected frontend or backend.");
  }
  if (environment.NODE_ENV && environment.NODE_ENV !== "development") {
    throw new Error("Local development commands require NODE_ENV=development.");
  }
  const frontendPort = port(settings, "FRONTEND_PORT");
  const backendPort = port(settings, "BACKEND_PORT");
  if (frontendPort === backendPort) {
    throw new Error("FRONTEND_PORT and BACKEND_PORT must be different.");
  }

  const result = { ...environment, NODE_ENV: "development" };
  if (application === "frontend") {
    result.PORT = frontendPort;
    result.BACKEND_INTERNAL_URL = `http://localhost:${backendPort}`;
  } else {
    result.PORT = backendPort;
    result.CORS_ORIGINS = `http://localhost:${frontendPort}`;
    const resetUrl = result.ADMIN_PASSWORD_RESET_URL;
    if (resetUrl) {
      if (!URL.canParse(resetUrl)) {
        throw new Error("Invalid ADMIN_PASSWORD_RESET_URL.");
      }
      const url = new URL(resetUrl);
      // Every local platform host (`*.localhost`) is served by the frontend dev server; no area name is repeated here.
      if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
        url.port = frontendPort;
        result.ADMIN_PASSWORD_RESET_URL = url.href;
      }
    }
  }
  return result;
}

if (import.meta.main) {
  const [application, ...extraArguments] = process.argv.slice(2);
  const settingsPath = resolve(root, ".env");
  if (!existsSync(settingsPath)) {
    throw new Error("Create the root .env from .env.example before starting development.");
  }
  const settings = parseEnv(readFileSync(settingsPath, "utf8"));
  const applicationPath = resolve(root, "apps", application ?? "");
  const backendEnvPath = resolve(root, "apps/backend/.env");
  const appEnvironment = application === "backend" && existsSync(backendEnvPath)
    ? parseEnv(readFileSync(backendEnvPath, "utf8"))
    : {};
  const environment = developmentEnvironment(application, settings, {
    ...appEnvironment,
    ...process.env,
  });
  const command = application === "frontend"
    ? ["node_modules/next/dist/bin/next", "dev", "--port", environment.PORT]
    : ["node_modules/@nestjs/cli/bin/nest.js", "start", "--watch"];
  // The console's documentation page reads a copy of the repository's documents, kept current while developing.
  const stopDocs = application === "frontend" ? watchDocs() : () => {};
  const child = spawn(process.execPath, [...command, ...extraArguments], {
    cwd: applicationPath,
    env: environment,
    stdio: "inherit",
  });
  const interrupt = () => child.kill("SIGINT");
  const terminate = () => child.kill("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  child.on("error", (error) => {
    console.error(`Failed to start ${application}: ${error.code ?? "unknown error"}`);
    stopDocs();
    process.exitCode = 1;
  });
  child.on("close", (code, signal) => {
    stopDocs();
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", terminate);
    process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
  });
}
