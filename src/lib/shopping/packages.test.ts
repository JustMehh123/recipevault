import { describe, expect, it } from "vitest";
import {
  bestPackIndex,
  getPackageOptions,
  packsNeeded,
  unitPriceLabel,
} from "./packages";
import { toBaseAmount } from "@/lib/parser/units";

describe("getPackageOptions", () => {
  it("returns real bottle sizes for milk in Canada", () => {
    const options = getPackageOptions("milk", "cup", "ca");
    expect(options.map((o) => o.label)).toContain("4 l");
    expect(options.every((o) => o.kind === "volume")).toBe(true);
  });

  it("returns US packaging for milk in the US", () => {
    const labels = getPackageOptions("milk", "cup", "us").map((o) => o.label);
    expect(labels.some((l) => l.includes("gallon"))).toBe(true);
  });

  it("sells eggs by the count, not by weight", () => {
    const options = getPackageOptions("eggs", null, "ca");
    expect(options.every((o) => o.kind === "count")).toBe(true);
    expect(options.map((o) => o.quantity)).toContain(12);
  });

  it("returns bag sizes for flour", () => {
    const options = getPackageOptions("all-purpose flour", "cup", "ca");
    expect(options.every((o) => o.kind === "mass")).toBe(true);
    expect(options.map((o) => o.label)).toContain("5 kg");
  });

  it("returns small jars for spices, not kilos", () => {
    const options = getPackageOptions("ground cumin", "tsp", "ca");
    expect(options[0].baseAmount).toBeLessThanOrEqual(50);
  });

  it("does not mistake 'ground cumin' for ground meat", () => {
    const cumin = getPackageOptions("ground cumin", "tsp", "ca");
    const beef = getPackageOptions("ground beef", "lb", "ca");
    expect(cumin[0].baseAmount).toBeLessThan(beef[0].baseAmount!);
  });

  it("keeps bell peppers in produce rather than the spice rack", () => {
    const options = getPackageOptions("red bell pepper", null, "ca");
    expect(options.every((o) => o.kind === "count")).toBe(true);
  });

  it("infers volume packaging for unknown liquids", () => {
    const options = getPackageOptions("mystery syrup thing", "ml", "ca");
    expect(options.every((o) => o.kind === "volume")).toBe(true);
  });

  it("infers mass packaging for unknown solids", () => {
    const options = getPackageOptions("zzz powder", "g", "ca");
    expect(options.every((o) => o.kind === "mass")).toBe(true);
  });

  it("falls back to counts when there is no unit at all", () => {
    const options = getPackageOptions("zzz thing", null, "ca");
    expect(options.every((o) => o.kind === "count")).toBe(true);
  });

  it("computes base amounts for convertible packs", () => {
    const oneLitre = getPackageOptions("milk", "cup", "ca").find((o) => o.label === "1 l");
    expect(oneLitre?.baseAmount).toBe(1000);
  });
});

describe("packsNeeded", () => {
  const options = getPackageOptions("milk", "cup", "ca");
  const oneLitre = options.find((o) => o.label === "1 l")!;

  it("still requires buying one pack for a tiny amount", () => {
    // 2 tbsp ≈ 30 ml — you still buy a whole bottle.
    expect(packsNeeded(30, null, oneLitre)).toBe(1);
  });

  it("rounds up to cover the full requirement", () => {
    expect(packsNeeded(2500, null, oneLitre)).toBe(3);
  });

  it("handles count packs", () => {
    const dozen = getPackageOptions("eggs", null, "ca").find((o) => o.quantity === 12)!;
    expect(packsNeeded(null, 18, dozen)).toBe(2);
    expect(packsNeeded(null, 5, dozen)).toBe(1);
  });

  it("defaults to one pack when the requirement is unknown", () => {
    expect(packsNeeded(null, null, oneLitre)).toBe(1);
  });
});

describe("bestPackIndex", () => {
  it("picks the smallest pack that covers the need in one go", () => {
    const options = getPackageOptions("milk", "cup", "ca");
    const need = toBaseAmount(3, "cup"); // ~710 ml
    const best = options[bestPackIndex(need, null, options)];
    expect(best.baseAmount).toBeGreaterThanOrEqual(need!);
    expect(best.label).toBe("1 l");
  });

  it("falls back to the largest pack when nothing covers it alone", () => {
    const options = getPackageOptions("milk", "cup", "ca");
    const best = options[bestPackIndex(99999, null, options)];
    expect(best).toBe(options[options.length - 1]);
  });
});

describe("unitPriceLabel", () => {
  it("computes a comparable per-100 price", () => {
    const oneLitre = getPackageOptions("milk", "cup", "ca").find((o) => o.label === "1 l")!;
    expect(unitPriceLabel(4, oneLitre, "$")).toBe("$0.40/100 ml");
  });

  it("returns null when it cannot be computed", () => {
    const dozen = getPackageOptions("eggs", null, "ca")[0];
    expect(unitPriceLabel(5, dozen, "$")).toBeNull();
    expect(unitPriceLabel(null, dozen, "$")).toBeNull();
  });
});
