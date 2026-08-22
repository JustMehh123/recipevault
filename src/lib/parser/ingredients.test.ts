import { describe, expect, it } from "vitest";
import {
  displayIngredient,
  formatQuantity,
  parseIngredientLine,
  scaleIngredient,
  scaleTextQuantities,
} from "./ingredients";

describe("parseIngredientLine", () => {
  it("splits quantity, unit, and name", () => {
    const ing = parseIngredientLine("2 cups all-purpose flour");
    expect(ing.quantity).toBe(2);
    expect(ing.unit).toBe("cup");
    expect(ing.name).toBe("all-purpose flour");
  });

  it("handles mixed numbers", () => {
    expect(parseIngredientLine("1 1/2 cups milk").quantity).toBeCloseTo(1.5);
  });

  it("handles simple fractions", () => {
    expect(parseIngredientLine("1/2 tsp salt").quantity).toBeCloseTo(0.5);
  });

  it("handles unicode fraction glyphs", () => {
    expect(parseIngredientLine("½ cup sugar").quantity).toBeCloseTo(0.5);
  });

  it("uses the low end of a range", () => {
    expect(parseIngredientLine("2 to 3 tbsp olive oil").quantity).toBe(2);
  });

  it("normalizes unit aliases", () => {
    expect(parseIngredientLine("3 tablespoons butter").unit).toBe("tbsp");
    expect(parseIngredientLine("2 lbs beef").unit).toBe("lb");
  });

  it("moves trailing text after a comma into notes", () => {
    const ing = parseIngredientLine("1 onion, finely diced");
    expect(ing.name).toBe("onion");
    expect(ing.notes).toBe("finely diced");
  });

  it("pulls parentheticals into notes", () => {
    const ing = parseIngredientLine("1 cup butter (softened)");
    expect(ing.name).toBe("butter");
    expect(ing.notes).toContain("softened");
  });

  it("keeps unparseable lines intact rather than losing them", () => {
    const ing = parseIngredientLine("Peanut or vegetable oil, for frying");
    expect(ing.quantity).toBeNull();
    expect(ing.raw).toContain("Peanut");
  });

  it("strips bullet markers", () => {
    expect(parseIngredientLine("- 2 eggs").quantity).toBe(2);
  });
});

describe("formatQuantity", () => {
  it("renders whole numbers plainly", () => {
    expect(formatQuantity(3)).toBe("3");
  });

  it("prefers friendly fractions", () => {
    expect(formatQuantity(0.5)).toBe("1/2");
    expect(formatQuantity(2.25)).toBe("2 1/4");
    expect(formatQuantity(1 / 3)).toBe("1/3");
  });
});

describe("scaleTextQuantities", () => {
  it("scales metric amounts embedded in text", () => {
    expect(scaleTextQuantities("(960mL)", 2.5)).toBe("(2400mL)");
    expect(scaleTextQuantities("(360g)", 2.5)).toBe("(900g)");
  });

  it("scales piece counts", () => {
    expect(scaleTextQuantities("or 8 of your favorite pieces", 2.5)).toContain("20");
  });

  it("never scales oven temperatures", () => {
    expect(scaleTextQuantities("bake at 350F", 2)).toBe("bake at 350F");
    expect(scaleTextQuantities("heat to 180 C", 2)).toContain("180");
  });

  it("never scales times", () => {
    expect(scaleTextQuantities("for 25 minutes", 3)).toBe("for 25 minutes");
    expect(scaleTextQuantities("rest 2 hours", 3)).toBe("rest 2 hours");
  });

  it("never scales pan dimensions or percentages", () => {
    expect(scaleTextQuantities("9x13 inch pan", 2)).toBe("9x13 inch pan");
    expect(scaleTextQuantities("2% milk", 2)).toBe("2% milk");
  });

  it("never scales digits glued to letters", () => {
    expect(scaleTextQuantities("V8 juice", 2)).toBe("V8 juice");
  });

  it("is a no-op at 1x", () => {
    expect(scaleTextQuantities("(960mL)", 1)).toBe("(960mL)");
  });
});

describe("scaleIngredient", () => {
  it("scales the parsed quantity", () => {
    const ing = parseIngredientLine("2 cups flour");
    expect(scaleIngredient(ing, 2.5).quantity).toBe(5);
  });

  it("scales quantity and embedded text together", () => {
    const ing = parseIngredientLine("1 quart whole buttermilk ((960mL))");
    const scaled = scaleIngredient(ing, 2.5);
    expect(scaled.quantity).toBeCloseTo(2.5);
    expect(displayIngredient(scaled)).toContain("2400");
  });

  it("leaves count-only ingredients without a quantity alone", () => {
    const ing = parseIngredientLine("Salt to taste");
    expect(scaleIngredient(ing, 4).quantity).toBeNull();
  });
});
