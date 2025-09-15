import type { FeatureCollection, Position } from "geojson";
import maplibregl from "maplibre-gl";

export function featureCollectionBounds(fc: FeatureCollection) {
  const b = new maplibregl.LngLatBounds();
  const add = ([lng, lat]: Position) => {
    if (Number.isFinite(lng) && Number.isFinite(lat)) b.extend([lng, lat]);
  };
  
  const walk = (c: any): void =>
    typeof c?.[0] === "number" ? add(c as Position) : c?.forEach?.(walk);

  for (const f of fc.features) {
    const g: any = f.geometry;
    if (!g) continue;
    if (g.type === "Point") add(g.coordinates as Position);
    else walk(g.coordinates);
  }
  return b;
}