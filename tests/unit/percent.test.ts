import { describe, expect, it } from "vitest";
import { fractionToPercent, percentToFraction } from "@/lib/percent";

describe("percentToFraction", () => {
  it.each([
    ["30", "0.3000"],
    ["12,5", "0.1250"],
    ["12.25", "0.1225"],
    ["0", "0.0000"],
    ["5", "0.0500"],
    ["100", "1.0000"],
    ["999,99", "9.9999"],
    [" 30 % ", "0.3000"],
  ])("%j → %s", (input, expected) => {
    expect(percentToFraction(input)).toEqual({ ok: true, fraction: expected });
  });

  it.each(["", "-5", "1000", "12,345", "abc", "1e2", "12,"])("recusa %j", (input) => {
    expect(percentToFraction(input).ok).toBe(false);
  });
});

describe("fractionToPercent", () => {
  it.each([
    ["0.3000", "30"],
    ["0.1250", "12,5"],
    ["0.1225", "12,25"],
    ["0.0000", "0"],
    ["0.0500", "5"],
    ["1.0000", "100"],
    ["9.9999", "999,99"],
  ])("%s → %s", (input, expected) => {
    expect(fractionToPercent(input)).toBe(expected);
  });

  it("ida e volta", () => {
    for (const value of ["0", "7", "33,33", "250", "0,5"]) {
      const parsed = percentToFraction(value);
      if (!parsed.ok) throw new Error(parsed.message);
      expect(fractionToPercent(parsed.fraction)).toBe(value);
    }
  });
});
