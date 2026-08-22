import { describe, expect, it } from "vitest";
import { aggregateIngredients, singularize, type AggregateInput } from "./aggregate";
import { parseIngredientLine } from "./ingredients";
import { toBaseAmount } from "./units";

function input(line: string, recipeId = "r1"): AggregateInput {
  return { ingredient: parseIngredientLine(line), recipeId };
}

describe("singularize", () => {
  it("handles regular plurals", () => {
    expect(singularize("eggs")).toBe("egg");
    expect(singularize("carrots")).toBe("carrot");
  });

  it("handles -ies and -oes", () => {
    expect(singularize("berries")).toBe("berry");
    expect(singularize("tomatoes")).toBe("tomato");
  });

  it("leaves mass nouns alone", () => {
    expect(singularize("asparagus")).toBe("asparagus");
    expect(singularize("oats")).toBe("oats");
  });
});

describe("aggregateIngredients", () => {
  it("merges duplicate ingredients across recipes", () => {
    const items = aggregateIngredients([input("2 eggs", "a"), input("3 eggs", "b")]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
    expect(items[0].sourceRecipeIds).toEqual(["a", "b"]);
  });

  it("merges singular and plural spellings", () => {
    const items = aggregateIngredients([input("1 carrot"), input("2 carrots")]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("merges mixed but compatible volume units", () => {
    // 2 cups (473ml) + 500ml = 973ml, however the unit ends up rendered.
    const items = aggregateIngredients([input("2 cups milk"), input("500 ml milk")]);
    expect(items).toHaveLength(1);
    const item = items[0];
    const asMl = toBaseAmount(item.quantity ?? 0, item.unit);
    expect(asMl).not.toBeNull();
    expect(asMl!).toBeGreaterThan(900);
    expect(asMl!).toBeLessThan(1050);
  });

  it("merges mixed but compatible mass units", () => {
    // 1 lb (453g) + 500g ≈ 953g
    const items = aggregateIngredients([input("1 lb beef"), input("500 g beef")]);
    expect(items).toHaveLength(1);
    const item = items[0];
    const asGrams = toBaseAmount(item.quantity ?? 0, item.unit);
    expect(asGrams).not.toBeNull();
    expect(asGrams!).toBeGreaterThan(880);
    expect(asGrams!).toBeLessThan(1000);
  });

  it("keeps incompatible units on separate lines", () => {
    const items = aggregateIngredients([input("2 cloves garlic"), input("1 head garlic")]);
    expect(items.length).toBeGreaterThan(1);
  });

  it("does not mix volume with mass", () => {
    const items = aggregateIngredients([input("1 cup flour"), input("100 g flour")]);
    expect(items).toHaveLength(2);
  });

  it("assigns grocery aisles", () => {
    const items = aggregateIngredients([input("2 cups milk"), input("1 onion")]);
    const milk = items.find((i) => i.name.toLowerCase().includes("milk"));
    const onion = items.find((i) => i.name.toLowerCase().includes("onion"));
    expect(milk?.category).toBe("Dairy & Eggs");
    expect(onion?.category).toBe("Produce");
  });

  it("collects notes without losing them", () => {
    const items = aggregateIngredients([input("1 onion, diced"), input("1 onion, sliced")]);
    expect(items[0].notes).toContain("diced");
    expect(items[0].notes).toContain("sliced");
  });

  it("ignores blank ingredient names", () => {
    expect(aggregateIngredients([{ ingredient: parseIngredientLine("   "), recipeId: "a" }])).toEqual(
      [],
    );
  });

  it("returns items sorted by aisle", () => {
    const items = aggregateIngredients([input("1 onion"), input("2 cups milk"), input("1 bread")]);
    const categories = items.map((i) => i.category);
    expect([...categories].sort()).toEqual(categories);
  });
});
