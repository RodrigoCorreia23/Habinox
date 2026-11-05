import { describe, expect, it } from "vitest";
import { clientIp, hashSubject } from "@/server/rate-limit";

describe("clientIp", () => {
  it("usa o primeiro valor do x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIp(h)).toBe("203.0.113.7");
  });

  it("recorre ao x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": " 198.51.100.2 " }))).toBe("198.51.100.2");
  });

  it("sem headers devolve 'unknown'", () => {
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": " , 10.0.0.1" }))).toBe("unknown");
  });
});

describe("hashSubject", () => {
  it("é estável e não contém o IP", () => {
    const a = hashSubject("203.0.113.7", "segredo");
    expect(a).toBe(hashSubject("203.0.113.7", "segredo"));
    expect(a).not.toContain("203");
    expect(a).toHaveLength(22);
  });

  it("muda com o segredo e com o IP", () => {
    expect(hashSubject("203.0.113.7", "a")).not.toBe(hashSubject("203.0.113.7", "b"));
    expect(hashSubject("203.0.113.7", "a")).not.toBe(hashSubject("203.0.113.8", "a"));
  });
});
