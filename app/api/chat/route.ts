import { streamText, tool, convertToModelMessages } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import type { FeatureCollection } from "geojson";
import { sgViewbox, toFeature } from "@/lib/helpers";
import {
  detectSide,
  splitViewbox,
  nominatimLocate,
  type VB,
} from "@/lib/locate";

export const maxDuration = 30;

const places_search = tool({
  description:
    `Called when the user is asking for locations. So if the user uses words like "where" or "places" or "locations". Builds token queries, ranks by tag/name hits, and returns a GeoJSON FeatureCollection.`,
  inputSchema: z.object({
    topic: z.string().describe(
  `Return a comma-separated list of place nouns or related words to search in OSM.
   If the user gives an activity or vague intent, REWRITE it into concrete venue types likely to appear in place names.
   Rules:
   - Nouns only (no verbs/adjectives), lowercase; a few items are fine.
   - Prefer OSM-ish nouns: parks, waterfronts, beaches, gardens, reservoirs, trails, malls, plazas, cinemas, libraries, museums,
     cafes, restaurants, bakeries, hawker centres, food courts, bars, pubs.
   - If cuisine/genre, include the noun: "ramen" → "ramen restaurants, japanese restaurants".
   - Some sample mappings: "date night" → "restaurants, bars, waterfronts"; "hangout" → "cafes, parks, malls"; "movie" → "cinemas".
`),
    area: z.string().default("Singapore"),
    limit: z.number().int().min(1).max(10).default(5),
    viewbox: z
      .object({ left: z.number(), top: z.number(), right: z.number(), bottom: z.number() })
      .optional(),
    placeType: z.enum([
      "restaurant","cafe","bar","fast_food","food_court","bakery",
      "place_of_worship","library","museum","park","hotel"
    ]).optional(),
  }),
  async execute({ topic, area, limit, viewbox, placeType, }) {
    const desired = limit ?? 5;

    const baseVB: VB = viewbox ?? sgViewbox();

    const side = detectSide(`${topic} ${area}`);

    const rows = await nominatimLocate(topic, {
      side,
      fullVB: baseVB,
      perQueryLimit: Math.min(50, 10000),
      maxResults: 10000,
      placeType,
    });

    
    // take top N and normalize to GeoJSON
    const top = rows.slice(0, desired);
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: top.map((r, idx) => toFeature(r, idx)),
    };

    return fc;
  },
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  console.log(messages);

  const result = streamText({
    model: openai("gpt-5-mini"),
    system: `You are a location assistant.
    - When the user asks to find/show/recommend any form of location on a map, call the places_search tool ONCE.`,
    messages: convertToModelMessages(messages),
    tools: { places_search },
  });

  return result.toUIMessageStreamResponse();
}
