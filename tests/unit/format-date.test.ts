import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative, formatTime } from "@/lib/format-date";

// 5 nov 2026, 15:00 em Lisboa (inverno: UTC+0).
const now = new Date("2026-11-05T15:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;

describe("formatDate e formatDateTime", () => {
  it("escrevem o mês abreviado e o ano com 4 dígitos", () => {
    expect(formatDate(new Date("2026-11-05T10:53:00Z"))).toBe("5 nov 2026");
    expect(formatDateTime(new Date("2026-11-05T10:53:00Z"))).toBe("5 nov 2026, 10:53");
  });

  it("usam o fuso de Lisboa (hora de verão incluída)", () => {
    // 23:30 UTC de 31 de julho já é 1 de agosto em Lisboa (UTC+1).
    expect(formatDateTime(new Date("2026-07-31T23:30:00Z"))).toBe("1 ago 2026, 00:30");
    expect(formatTime(new Date("2026-07-31T23:30:00Z"))).toBe("00:30");
    // No inverno, Lisboa = UTC.
    expect(formatDateTime(new Date("2026-01-15T08:05:00Z"))).toBe("15 jan 2026, 08:05");
  });

  it("aceitam texto ISO", () => {
    expect(formatDate("2026-03-02T12:00:00Z")).toBe("2 mar 2026");
  });
});

describe("formatRelative", () => {
  it("agora, menos de um minuto", () => {
    expect(formatRelative(ago(20_000), now)).toBe("agora");
  });

  it("minutos", () => {
    expect(formatRelative(ago(12 * MIN), now)).toBe("há 12 min");
    expect(formatRelative(ago(59 * MIN), now)).toBe("há 59 min");
  });

  it("horas, até 3 h no mesmo dia", () => {
    expect(formatRelative(ago(2 * HOUR + 10 * MIN), now)).toBe("há 2 h");
  });

  it("hoje às, mais cedo no mesmo dia", () => {
    expect(formatRelative(new Date("2026-11-05T09:20:00Z"), now)).toBe("hoje às 09:20");
  });

  it("ontem às", () => {
    expect(formatRelative(new Date("2026-11-04T20:46:00Z"), now)).toBe("ontem às 20:46");
    // Ontem mesmo que tenha passado menos de 3 h (pouco depois da meia-noite).
    expect(formatRelative(new Date("2026-11-04T23:30:00Z"), new Date("2026-11-05T00:30:00Z"))).toBe(
      "ontem às 23:30",
    );
  });

  it("dias, até 6", () => {
    expect(formatRelative(new Date("2026-11-02T10:00:00Z"), now)).toBe("há 3 dias");
    expect(formatRelative(new Date("2026-10-30T10:00:00Z"), now)).toBe("há 6 dias");
  });

  it("depois disso, a data", () => {
    expect(formatRelative(new Date("2026-10-29T10:00:00Z"), now)).toBe("29 out 2026");
  });

  it("conta os dias pelo calendário de Lisboa", () => {
    // 23:30 UTC de 3 de agosto = 00:30 de 4 de agosto em Lisboa: é «ontem» a 5 de agosto.
    const summerNow = new Date("2026-08-05T10:00:00Z");
    expect(formatRelative(new Date("2026-08-03T23:30:00Z"), summerNow)).toBe("ontem às 00:30");
  });

  it("datas no futuro mostram a data completa", () => {
    expect(formatRelative(new Date("2026-11-06T09:00:00Z"), now)).toBe("6 nov 2026, 09:00");
  });
});
