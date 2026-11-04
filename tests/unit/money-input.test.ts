import { describe, expect, it } from "vitest";
import { centsToEuroInput, parseEuroInput } from "@/lib/money";

describe("parseEuroInput", () => {
  it.each([
    ["23,50", 2350],
    ["23.5", 2350],
    ["120", 12000],
    ["0", 0],
    ["1 290", 129000],
    ["1 290,99 €", 129099],
    ["0,05", 5],
  ])("%j → %i", (input, cents) => {
    expect(parseEuroInput(input)).toEqual({ ok: true, cents });
  });

  it.each(["", "-5", "abc", "1,234", "12,", "1e3", "1.290,50"])("recusa %j", (input) => {
    expect(parseEuroInput(input).ok).toBe(false);
  });
});

describe("centsToEuroInput", () => {
  it.each([
    [2350, "23,50"],
    [5, "0,05"],
    [12000, "120,00"],
  ])("%i → %s", (cents, text) => {
    expect(centsToEuroInput(cents)).toBe(text);
  });
});
