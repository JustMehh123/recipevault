import { NextRequest } from "next/server";
import { fetchAndParseRecipe, RecipeScrapeError } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = typeof body === "object" && body !== null ? (body as Record<string, unknown>).url : null;
  if (typeof url !== "string" || !url.trim()) {
    return Response.json({ error: "A recipe URL is required." }, { status: 400 });
  }

  try {
    const recipe = await fetchAndParseRecipe(url.trim());
    return Response.json({ recipe });
  } catch (error) {
    if (error instanceof RecipeScrapeError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("Unexpected scrape error", error);
    return Response.json({ error: "Something went wrong while importing that recipe." }, { status: 500 });
  }
}
