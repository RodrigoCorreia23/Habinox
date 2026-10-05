import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/unit/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    // Valores fictícios para que os módulos que importam src/env.ts carreguem nos testes.
    env: {
      CRON_SECRET: "test-cron-secret-0123456789abcdef0123",
      DATABASE_URL: "postgres://abinox:abinox@localhost:5433/abinox_test",
      BETTER_AUTH_SECRET: "test-auth-secret-0123456789abcdef01234567",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
});
