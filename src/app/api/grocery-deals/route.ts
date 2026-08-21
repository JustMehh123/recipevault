import { NextRequest } from "next/server";
import { findGroceryDeals } from "@/lib/shopping/deals";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const query = typeof record.query === "string" ? record.query.trim() : "";
  const postalCode = typeof record.postalCode === "string" ? record.postalCode.trim() : "";
  const country = typeof record.country === "string" ? record.country : "";
  const countryCode = typeof record.countryCode === "string" ? record.countryCode : "";
  const lat = typeof record.lat === "number" ? record.lat : Number(record.lat);
  const lng = typeof record.lng === "number" ? record.lng : Number(record.lng);

  if (!query) {
    return Response.json({ error: "An item name is required." }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "Save your address first so we know where to shop." }, { status: 400 });
  }

  try {
    const deals = await findGroceryDeals({ query, postalCode, lat, lng, country, countryCode });
    return Response.json({ deals }, { headers: { "Cache-Control": "private, max-age=120" } });
  } catch (error) {
    console.error("grocery-deals error", error);
    return Response.json({ error: "Couldn't load nearby prices right now. Try again in a moment." }, { status: 502 });
  }
}
