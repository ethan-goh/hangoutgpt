"use client";

import maplibregl, { Map as MLMap, GeoJSONSource, LngLatBoundsLike } from "maplibre-gl";
import { featureCollectionBounds } from "@/lib/geo";
import { onNomSearch } from "@/lib/events";
import { useEffect, useRef } from "react";

export default function Map() {
  const mapRef = useRef<MLMap | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const style = `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`;
    
    const map = new maplibregl.Map({
      container: elRef.current as HTMLDivElement,
      style,
      center: [103.851959, 1.29027], 
      zoom: 11
    });
    const listen = onNomSearch((fc) => {
    const src = map.getSource("search") as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(fc);

    const b = featureCollectionBounds(fc);
    if (!b.isEmpty()) map.fitBounds(b, { padding: 32, duration: 600, maxZoom: 16 });
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("search", { type: "geojson", data: { type:"FeatureCollection", features: [] } });
      map.addLayer({ id:"search-fill",  type:"fill",   source:"search", paint:{ "fill-color":"#22c55e", "fill-opacity":0.25 } });
      map.addLayer({ id:"search-line",  type:"line",   source:"search", paint:{ "line-color":"#16a34a", "line-width":2 } });
      map.addLayer({ id:"search-point", type:"circle", source:"search", paint:{ "circle-radius":6, "circle-color":"#1d4ed8", "circle-stroke-width":1, "circle-stroke-color":"#fff" } });
      map.addLayer({
        id: "search-label",
        type: "symbol",
        source: "search",
        layout: { "text-field": ["coalesce", ["get","short_name"], ["get","display_name"]], "text-size": 12, "text-offset": [0,1.2], "text-anchor":"top" },
        paint: { "text-halo-width": 1.2, "text-halo-color": "rgba(255,255,255,0.95)" }
        });
      map.addLayer({
        id: "search-heat",
        type: "heatmap",
        source: "search",
        layout: { visibility: "none" },
        paint: { "heatmap-radius": 30, "heatmap-opacity": 0.6 }
        });
    });

    return () => {
      listen();
      map.remove();
    };
  }, []);

  
  return (
    <div 
      ref={elRef} 
      className="absolute inset-0 w-full h-full"
      style={{ minHeight: '400px', minWidth: '300px' }}
    />
  );
}
