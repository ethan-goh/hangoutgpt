import type { FeatureCollection, Feature, Geometry } from "geojson";

export function extractRequestedCount(text: string | undefined, fallback = 5) {
  if (!text) return fallback;
  const m = text.match(/\b(\d{1,2})\b/);
  if (!m) return fallback;
  const n = Math.min(10, Math.max(1, parseInt(m[1], 10)));
  return n;
}

export function sgViewbox() {
  return { left: 103.6, top: 1.48, right: 104.1, bottom: 1.15 };
}

export function toFeature(r: any, rank: number): Feature {
  const geometry: Geometry =
    r.geojson ?? ({ type: "Point", coordinates: [Number(r.lon), Number(r.lat)] } as Geometry);

  const short = String(r.display_name || "").split(",")[0].trim();
  const category = [r.class, r.type].filter(Boolean).join(":");

  return {
    type: "Feature",
    geometry,
    properties: {
      osm_id: r.osm_id,
      osm_type: r.osm_type,
      display_name: r.display_name,
      short_name: short,
      category,
      class: r.class,
      type: r.type,
      importance: r.importance,
      __rank: rank
    }
  };
}

