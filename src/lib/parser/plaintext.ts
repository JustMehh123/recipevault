import type { ScrapedRecipe } from "@/types";

const INGREDIENT_HEADERS = /^(ingredients?)\s*:?\s*$/i;
const INSTRUCTION_HEADERS = /^(instructions?|directions?|method|steps?)\s*:?\s*$/i;

/**
 * Heuristically splits freeform pasted recipe text into title / ingredients /
 * instructions sections. Recognizes common "Ingredients" / "Instructions"
 * headers (with or without a trailing colon) and otherwise falls back to
 * treating short lines as ingredients and longer ones as steps.
 */
export function parsePlainTextRecipe(text: string): ScrapedRecipe {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return emptyScrapedRecipe();
  }

  let title = "";
  const ingredientLines: string[] = [];
  const instructionLines: string[] = [];

  let section: "none" | "ingredients" | "instructions" = "none";
  let usedFirstLineAsTitle = false;

  for (const line of lines) {
    if (INGREDIENT_HEADERS.test(line)) {
      section = "ingredients";
      continue;
    }
    if (INSTRUCTION_HEADERS.test(line)) {
      section = "instructions";
      continue;
    }

    if (!usedFirstLineAsTitle && section === "none") {
      title = line;
      usedFirstLineAsTitle = true;
      continue;
    }

    if (section === "ingredients") {
      ingredientLines.push(stripLeadingMarker(line));
    } else if (section === "instructions") {
      instructionLines.push(stripLeadingMarker(line));
    } else {
      // No explicit headers found yet — use simple heuristics.
      const looksNumbered = /^\d+[.)]/.test(line);
      const isShort = line.length <= 80 && !/[.!?]$/.test(line);
      if (looksNumbered) {
        instructionLines.push(stripLeadingMarker(line));
      } else if (isShort) {
        ingredientLines.push(stripLeadingMarker(line));
      } else {
        instructionLines.push(stripLeadingMarker(line));
      }
    }
  }

  return {
    title: title || "Imported Recipe",
    description: "",
    image: null,
    sourceUrl: "",
    sourceName: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    totalTimeMinutes: null,
    servings: 4,
    ingredientLines,
    instructions: instructionLines,
    tags: [],
    cuisine: null,
  };
}

function stripLeadingMarker(line: string): string {
  return line.replace(/^[-•*\u2022]+\s*/, "").replace(/^\d+[.)]\s*/, "");
}

function emptyScrapedRecipe(): ScrapedRecipe {
  return {
    title: "",
    description: "",
    image: null,
    sourceUrl: "",
    sourceName: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    totalTimeMinutes: null,
    servings: 4,
    ingredientLines: [],
    instructions: [],
    tags: [],
    cuisine: null,
  };
}
