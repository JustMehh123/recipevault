import { NextRequest } from "next/server";
import { geocodeAddress, reverseGeocode } from "@/lib/shopping/nominatim";

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
  const lat = typeof record.lat === "number" ? record.lat : Number(record.lat);
  const lng = typeof record.lng === "number" ? record.lng : Number(record.lng);

  try {
    if (Number.isFinite(lat) && Number.isFinite(lng) && !query) {
      const address = await reverseGeocode(lat, lng);
      return Response.json({ address });
    }
    if (!query) {
      return Response.json({ error: "An address is required." }, { status: 400 });
    }
    const address = await geocodeAddress(query);
    return Response.json({ address });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't look up that address.";
    return Response.json({ error: message }, { status: 422 });
  }
}
