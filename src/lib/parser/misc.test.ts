import { describe, expect, it } from "vitest";
import { detectTimers, formatClock, formatDuration } from "./timers";
import { parseISODuration, minutesToISODuration } from "./duration";
import { categorizeIngredient } from "./category";
import { parsePlainTextRecipe } from "./plaintext";

describe("parseISODuration", () => {
  it("parses ISO-8601 durations", () => {
    expect(parseISODuration("PT30M")).toBe(30);
    expect(parseISODuration("PT1H30M")).toBe(90);
    expect(parseISODuration("PT2H")).toBe(120);
  });

  it("falls back to plain English", () => {
    expect(parseISODuration("1 hour 30 minutes")).toBe(90);
    expect(parseISODuration("45 min")).toBe(45);
  });

  it("returns null for junk", () => {
    expect(parseISODuration("")).toBeNull();
    expect(parseISODuration(null)).toBeNull();
    expect(parseISODuration("whenever")).toBeNull();
  });

  it("round-trips through minutesToISODuration", () => {
    expect(parseISODuration(minutesToISODuration(90))).toBe(90);
  });
});

describe("detectTimers", () => {
  it("finds multiple durations in one step", () => {
    const timers = detectTimers("Fry 7 minutes for wings, 12 minutes for drumsticks.");
    expect(timers.map((t) => t.seconds)).toEqual([420, 720]);
  });

  it("uses the longer end of a range", () => {
    expect(detectTimers("Refrigerate for 2 to 3 hours.")[0].seconds).toBe(10800);
  });

  it("handles seconds", () => {
    expect(detectTimers("Cook garlic 30 seconds.")[0].seconds).toBe(30);
  });

  it("finds nothing when there is no duration", () => {
    expect(detectTimers("Stir well and serve.")).toEqual([]);
  });

  it("ignores absurd durations", () => {
    expect(detectTimers("Age for 400 hours.")).toEqual([]);
  });
});

describe("formatDuration / formatClock", () => {
  it("formats human durations", () => {
    expect(formatDuration(90)).toBe("1 min 30s");
    expect(formatDuration(3600)).toBe("1 hr");
    expect(formatDuration(5400)).toBe("1 hr 30 min");
  });

  it("formats countdown clocks", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(3665)).toBe("1:01:05");
    expect(formatClock(-5)).toBe("00:00");
  });
});

describe("categorizeIngredient", () => {
  it("files common ingredients into the right aisle", () => {
    expect(categorizeIngredient("chicken breast")).toBe("Meat & Seafood");
    expect(categorizeIngredient("whole milk")).toBe("Dairy & Eggs");
    expect(categorizeIngredient("yellow onion")).toBe("Produce");
    expect(categorizeIngredient("sourdough bread")).toBe("Bakery");
    expect(categorizeIngredient("ground cumin")).toBe("Spices & Condiments");
    expect(categorizeIngredient("all-purpose flour")).toBe("Pantry");
  });

  it("falls back to Other for unknowns", () => {
    expect(categorizeIngredient("zzzzz")).toBe("Other");
  });
});

describe("parsePlainTextRecipe", () => {
  it("splits on explicit headings", () => {
    const recipe = parsePlainTextRecipe(
      ["Grandma's Cake", "Ingredients", "2 cups flour", "3 eggs", "Instructions", "Mix it.", "Bake it."].join(
        "\n",
      ),
    );
    expect(recipe.title).toBe("Grandma's Cake");
    expect(recipe.ingredientLines).toEqual(["2 cups flour", "3 eggs"]);
    expect(recipe.instructions).toEqual(["Mix it.", "Bake it."]);
  });

  it("strips numbering from steps", () => {
    const recipe = parsePlainTextRecipe("Title\nInstructions\n1. First\n2. Second");
    expect(recipe.instructions).toEqual(["First", "Second"]);
  });

  it("handles empty input without throwing", () => {
    expect(parsePlainTextRecipe("").ingredientLines).toEqual([]);
  });
});
