import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it.each(["/admin", "/pt/conta", "/pt/conta?tab=encomendas"])("aceita %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    undefined,
    "",
    "admin",
    "https://malicioso.com",
    "//malicioso.com",
    "/\\malicioso.com",
    "/pt\n/conta",
    ["/admin"],
  ])("rejeita %j", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});
