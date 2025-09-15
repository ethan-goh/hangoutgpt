export type NomSearchResult = GeoJSON.FeatureCollection;

export const emitNomSearch = (fc: NomSearchResult) => {
  window.dispatchEvent(new CustomEvent("nom_search_result", { detail: fc }));
};

export const onNomSearch = (callback: (fc: NomSearchResult) => void) => {
  const handler = (e: Event) => callback((e as CustomEvent).detail);
  window.addEventListener("nom_search_result", handler);
  return () => window.removeEventListener("nom_search_result", handler);
};
