import { describe, expect, it } from "vitest";
import { extractJsonLdRecipe } from "./jsonld";
import { normalizeRecipeSchema } from "./normalize";
import { extractMicrodataRecipe } from "./microdata";

function page(jsonLd: unknown): string {
  return `<!doctype html><html><head>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head><body><h1>ignored</h1></body></html>`;
}

const BASE_RECIPE = {
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Test Pancakes",
  description: "Fluffy.",
  image: "https://example.com/img.jpg",
  recipeYield: "4 servings",
  prepTime: "PT10M",
  cookTime: "PT15M",
  totalTime: "PT25M",
  recipeIngredient: ["2 cups flour", "1 tsp salt"],
  recipeInstructions: ["Mix.", "Cook."],
  recipeCategory: "Breakfast",
  recipeCuisine: "American",
};

describe("extractJsonLdRecipe", () => {
  it("finds a plain Recipe node", () => {
    expect(extractJsonLdRecipe(page(BASE_RECIPE))?.name).toBe("Test Pancakes");
  });

  it("finds a Recipe inside an array", () => {
    expect(extractJsonLdRecipe(page([{ "@type": "WebSite" }, BASE_RECIPE]))?.name).toBe(
      "Test Pancakes",
    );
  });

  it("finds a Recipe inside @graph", () => {
    const html = page({ "@context": "https://schema.org", "@graph": [BASE_RECIPE] });
    expect(extractJsonLdRecipe(html)?.name).toBe("Test Pancakes");
  });

  it("handles @type given as an array", () => {
    const html = page({ ...BASE_RECIPE, "@type": ["Recipe", "NewsArticle"] });
    expect(extractJsonLdRecipe(html)?.name).toBe("Test Pancakes");
  });

  it("recovers from trailing commas in JSON", () => {
    const html = `<html><head><script type="application/ld+json">
      {"@type":"Recipe","name":"Sloppy JSON","recipeIngredient":["1 egg",],}
    </script></head><body></body></html>`;
    expect(extractJsonLdRecipe(html)?.name).toBe("Sloppy JSON");
  });

  it("returns null when there is no recipe", () => {
    expect(extractJsonLdRecipe(page({ "@type": "WebSite", name: "Blog" }))).toBeNull();
    expect(extractJsonLdRecipe("<html><body>nothing</body></html>")).toBeNull();
  });
});

describe("normalizeRecipeSchema", () => {
  it("maps the standard fields", () => {
    const schema = extractJsonLdRecipe(page(BASE_RECIPE))!;
    const recipe = normalizeRecipeSchema(schema, "https://example.com/pancakes");

    expect(recipe.title).toBe("Test Pancakes");
    expect(recipe.servings).toBe(4);
    expect(recipe.prepTimeMinutes).toBe(10);
    expect(recipe.cookTimeMinutes).toBe(15);
    expect(recipe.totalTimeMinutes).toBe(25);
    expect(recipe.ingredientLines).toHaveLength(2);
    expect(recipe.instructions).toEqual(["Mix.", "Cook."]);
    expect(recipe.sourceName).toBe("example.com");
  });

  it("flattens HowToStep instructions", () => {
    const schema = extractJsonLdRecipe(
      page({
        ...BASE_RECIPE,
        recipeInstructions: [
          { "@type": "HowToStep", text: "Whisk the eggs." },
          { "@type": "HowToStep", text: "Fold in flour." },
        ],
      }),
    )!;
    const recipe = normalizeRecipeSchema(schema, "https://example.com/r");
    expect(recipe.instructions).toEqual(["Whisk the eggs.", "Fold in flour."]);
  });

  it("flattens nested HowToSection instructions", () => {
    const schema = extractJsonLdRecipe(
      page({
        ...BASE_RECIPE,
        recipeInstructions: [
          {
            "@type": "HowToSection",
            name: "Dough",
            itemListElement: [{ "@type": "HowToStep", text: "Knead." }],
          },
        ],
      }),
    )!;
    const recipe = normalizeRecipeSchema(schema, "https://example.com/r");
    expect(recipe.instructions).toContain("Knead.");
    expect(recipe.instructions.some((s) => s.includes("DOUGH"))).toBe(true);
  });

  it("extracts an image given as an object or array", () => {
    const asObject = normalizeRecipeSchema(
      extractJsonLdRecipe(page({ ...BASE_RECIPE, image: { url: "https://x.com/a.jpg" } }))!,
      "https://example.com/r",
    );
    expect(asObject.image).toBe("https://x.com/a.jpg");

    const asArray = normalizeRecipeSchema(
      extractJsonLdRecipe(page({ ...BASE_RECIPE, image: ["https://x.com/b.jpg"] }))!,
      "https://example.com/r",
    );
    expect(asArray.image).toBe("https://x.com/b.jpg");
  });

  it("falls back to 4 servings when yield is unparseable", () => {
    const schema = extractJsonLdRecipe(page({ ...BASE_RECIPE, recipeYield: "a bunch" }))!;
    expect(normalizeRecipeSchema(schema, "https://example.com/r").servings).toBe(4);
  });

  it("survives a recipe with no instructions", () => {
    const schema = extractJsonLdRecipe(page({ ...BASE_RECIPE, recipeInstructions: undefined }))!;
    expect(normalizeRecipeSchema(schema, "https://example.com/r").instructions).toEqual([]);
  });
});

describe("extractMicrodataRecipe", () => {
  it("parses itemprop markup as a fallback", () => {
    const html = `<html><body>
      <div itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Microdata Soup</h1>
        <span itemprop="recipeIngredient">1 onion</span>
        <span itemprop="recipeIngredient">2 cups broth</span>
        <li itemprop="recipeInstructions">Simmer everything.</li>
        <span itemprop="recipeYield">6</span>
      </div></body></html>`;

    const recipe = extractMicrodataRecipe(html, "https://example.com/soup");
    expect(recipe?.title).toBe("Microdata Soup");
    expect(recipe?.ingredientLines).toHaveLength(2);
    expect(recipe?.servings).toBe(6);
  });

  it("returns null without Recipe markup", () => {
    expect(extractMicrodataRecipe("<html><body><p>hi</p></body></html>", "https://x.com")).toBeNull();
  });
});
