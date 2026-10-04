import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Em CI corre sobre o build de produção; localmente reaproveita o dev server se existir.
  webServer: {
    command: process.env.CI ? `pnpm start -p ${port}` : `pnpm dev -p ${port}`,
    url: `http://localhost:${port}/pt`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
