import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["*.localhost"],
  distDir: process.env.PMN_PREVIEW === "1" ? ".next-preview" : ".next",
  serverExternalPackages: ["@mantine/colors-generator"],
  // Contract tests import the backend's sources, which a deployment of this project alone does not have.
  typescript: { tsconfigPath: "tsconfig.build.json" },
  // The committed documents are read from disk at request time, so the file tracer cannot see them on its own.
  outputFileTracingIncludes: {
    "/\\[locale\\]/panel/documentation{,/\\[id\\]}": ["./content/docs/**/*"],
  },
  logging: {
    serverFunctions: false,
    // Readers' requests are not logged in development either.
    incomingRequests: { ignore: [/.*/] },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
