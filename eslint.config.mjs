import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Network-backed providers intentionally update loading state when accounts change.
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  globalIgnores([
    ".next/**",
    ".next-profile-test/**",
    "drizzle/**",
    "node_modules/**",
  ]),
]);
