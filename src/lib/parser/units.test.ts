import { describe, expect, it } from "vitest";
import { convertIngredient, hasConvertibleUnits, fromBaseAmount, toBaseAmount } from "./units";
import { parseIngredientLine } from "./ingredients";

describe("toBaseAmount", () => {
  it("converts volume to millilitres", () => {
    expect(toBaseAmount(1, "cup")).toBeCloseTo(236.588, 2);
    expect(toBaseAmount(1, "l")).toBe(1000);
  });

  it("converts mass to grams", () => {
    expect(toBaseAmount(1, "lb")).toBeCloseTo(453.592, 2);
    expect(toBaseAmount(2, "kg")).toBe(2000);
  });

  it("returns null for unknown units", () => {
    expect(toBaseAmount(1, "clove")).toBeNull();
    expect(toBaseAmount(1, null)).toBeNull();
  });
});

describe("fromBaseAmount", () => {
  it("steps up to larger units when sensible", () => {
    const result = fromBaseAmount(2000, "volume", "metric");
    expect(result.unit).toBe("l");
    expect(result.quantity).toBeCloseTo(2, 1);
  });

  it("keeps small amounts in small units", () => {
    expect(fromBaseAmount(50, "volume", "metric").unit).toBe("ml");
  });
});

describe("convertIngredient", () => {
  it("converts US volume to metric", () => {
    const ing = parseIngredientLine("2 cups milk");
    const metric = convertIngredient(ing, "metric");
    expect(metric.unit).toBe("ml");
    expect(metric.quantity).toBeGreaterThan(450);
    expect(metric.quantity).toBeLessThan(500);
  });

  it("converts metric mass to US", () => {
    const ing = parseIngredientLine("500 g flour");
    const us = convertIngredient(ing, "imperial");
    expect(us.unit).toBe("lb");
  });

  it("leaves counts untouched", () => {
    const ing = parseIngredientLine("3 cloves garlic");
    expect(convertIngredient(ing, "metric").unit).toBe("clove");
  });

  it("leaves unitless ingredients untouched", () => {
    const ing = parseIngredientLine("2 eggs");
    const converted = convertIngredient(ing, "metric");
    expect(converted.quantity).toBe(2);
    expect(converted.unit).toBeNull();
  });

  it("is a no-op for the original system", () => {
    const ing = parseIngredientLine("2 cups milk");
    expect(convertIngredient(ing, "original")).toBe(ing);
  });

  it("round-trips without meaningful drift", () => {
    const ing = parseIngredientLine("4 cups water");
    const metric = convertIngredient(ing, "metric");
    const back = convertIngredient(metric, "imperial");
    expect(back.quantity).toBeGreaterThan(3.7);
    expect(back.quantity).toBeLessThan(4.3);
  });
});

describe("hasConvertibleUnits", () => {
  it("detects convertible recipes", () => {
    expect(hasConvertibleUnits([parseIngredientLine("2 cups milk")])).toBe(true);
  });

  it("returns false when nothing can convert", () => {
    expect(
      hasConvertibleUnits([parseIngredientLine("2 eggs"), parseIngredientLine("1 clove garlic")]),
    ).toBe(false);
  });
});
