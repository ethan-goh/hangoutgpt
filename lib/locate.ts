
export type Side = "east" | "west" | "north" | "south" | "all";
export type VB = { left: number; top: number; right: number; bottom: number }; // west, north, east, south


export function detectSide(text: string): Side {
  const s = text.toLowerCase();
  if (/\beast\b/.test(s)) return "east";
  if (/\bwest\b/.test(s)) return "west";
  if (/\bnorth\b/.test(s)) return "north";
  if (/\bsouth\b/.test(s)) return "south";
  return "all";
}

export function splitViewbox(vb: VB, side: Side): VB {
  if (!side || side === "all") return vb;
  const mx = (vb.left + vb.right) / 2;
  const my = (vb.top + vb.bottom) / 2;
  switch (side) {
    case "east":  return { left: mx,      top: vb.top, right: vb.right, bottom: vb.bottom };
    case "west":  return { left: vb.left, top: vb.top, right: mx,       bottom: vb.bottom };
    case "north": return { left: vb.left, top: vb.top, right: vb.right, bottom: my };
    case "south": return { left: vb.left, top: my,     right: vb.right, bottom: vb.bottom };
    default:      return vb;
  }
}


const STOPWORDS = new Set([
  "the","a","an","in","at","of","for","to","near","around","with","and","or",
  "place","places","spot","spots","best","top","popular","good","nice",
  "north","south","east","west"
]);

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function extractTokens(topic: string): string[] {
  const clean = stripAccents(topic.toLowerCase());
  const raw = clean.split(/[^a-z0-9+]+/g).filter(Boolean);
  const uniq = Array.from(new Set(raw));
  return uniq.filter(t => !STOPWORDS.has(t) && t.length >= 2);
}


function buildQuerySet(topic: string): string[] {
  const tokens = extractTokens(topic);
  const set = new Set<string>();
  const joined = tokens.join(" ");

  if (topic.trim()) set.add(topic.trim());
  if (joined) set.add(joined);
  for (const tk of tokens.slice(0, 3)) set.add(tk); 

  return Array.from(set);
}


function insideVB(p: any, vb: VB): boolean {
  const lon = Number(p.lon ?? p?.geometry?.coordinates?.[0]);
  const lat = Number(p.lat ?? p?.geometry?.coordinates?.[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  return lon >= vb.left && lon <= vb.right && lat <= vb.top && lat >= vb.bottom;
}

function filterBySide(rows: any[], side: Side, fullVB?: VB): any[] {
  if (!side || side === "all") return rows;
  
  if (!fullVB) return rows;
  const vb = splitViewbox(fullVB, side);
  return rows.filter(r => insideVB(r, vb));
}

function semisplit(v: unknown): string[] {
  if (v == null) return [];
  const s = String(v).toLowerCase();
  return s.split(/[;,\|/]+/).map(x => x.trim()).filter(Boolean);
}

function getAllTags(p: any): Record<string, string> {
  const t = { ...(p.tags || {}), ...(p.extratags || {}) };
  if (p.category) t.category = String(p.category);
  if (p.type)     t.type     = String(p.type);
  return t;
}

function tokenHitCountInTags(p: any, tokens: string[]): number {
  if (!tokens.length) return 0;
  const tags = getAllTags(p);
  let score = 0;

  for (const v of Object.values(tags)) {
    const parts = semisplit(v);
    if (parts.length) {
      for (const tk of tokens) if (parts.some(x => x.includes(tk))) score++;
    } else {
      const vs = String(v).toLowerCase();
      for (const tk of tokens) if (vs.includes(tk)) score++;
    }
  }
  return score;
}

function tokenHitCountInName(p: any, tokens: string[]): number {
  const name = stripAccents(String(p.display_name || p.name || "")).toLowerCase();
  let score = 0;
  for (const tk of tokens) if (name.includes(tk)) score++;
  return score;
}

function rankByTokens(rows: any[], topic: string): any[] {
  const tokens = extractTokens(topic);
  rows.sort((a, b) => {
    const aTag = tokenHitCountInTags(a, tokens);
    const bTag = tokenHitCountInTags(b, tokens);
    if (bTag !== aTag) return bTag - aTag;

    const aName = tokenHitCountInName(a, tokens);
    const bName = tokenHitCountInName(b, tokens);
    if (bName !== aName) return bName - aName;

    const aDetail = (a.address && Object.keys(a.address).length ? 1 : 0) + (a.namedetails ? 1 : 0);
    const bDetail = (b.address && Object.keys(b.address).length ? 1 : 0) + (b.namedetails ? 1 : 0);
    if (bDetail !== aDetail) return bDetail - aDetail;

    const ia = Number(a.importance ?? 0), ib = Number(b.importance ?? 0);
    if (ib !== ia) return ib - ia;

    return String(a.display_name || a.name || "").localeCompare(String(b.display_name || b.name || ""));
  });
  return rows;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const UA = process.env.NOMINATIM_USER_AGENT || "hangoutgpt (your-email@example.com)";

type NominatimParams = {
  q: string;
  viewbox?: VB;
  limit?: number;
  bounded?: boolean;
};

async function nominatimSearch(params: NominatimParams): Promise<any[]> {
  const { q, viewbox, limit = 50, bounded = Boolean(viewbox) } = params;
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("countrycodes", "sg"); 
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("limit", limit.toString());
  if (viewbox) {
    const { left, top, right, bottom } = viewbox; 
    url.searchParams.set("viewbox", `${left},${top},${right},${bottom}`);
    if (bounded) url.searchParams.set("bounded", "1");
  }

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}


function dedupByOSM(rows: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of rows) {
    const key = `${r.osm_type || ""}:${r.osm_id || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export type LocateOptions = {
  side?: Side;
  fullVB?: VB;
  perQueryLimit?: number;
  maxResults?: number;
  placeType?: string;
};

export async function nominatimLocate(topic: string, opts: LocateOptions = {}) {
  const { side = "all", fullVB, perQueryLimit = 50, maxResults = 100, placeType } = opts;

  const queries = buildQuerySet(topic);
  console.log(queries);

  const vb = fullVB ? splitViewbox(fullVB, side) : undefined;

  const batches: any[][] = [];
  for (const q of queries) {
    try {
      const rows = await nominatimSearch({ q, viewbox: vb, limit: perQueryLimit, bounded: Boolean(vb) });
      batches.push(rows);
    } catch {
    }
  }
  
  let merged = dedupByOSM(batches.flat());

  if (placeType) {
    const pt = String(placeType).toLowerCase();
    const original = merged;

    const matchesPlaceType = (r: any) => {
      const type = String(r.type || "").toLowerCase();        
      if (type === pt) return true;

      const amenity =
        String(r.tags?.amenity || r.extratags?.amenity || "").toLowerCase();
      return amenity === pt;
    };

    let filtered = merged.filter(matchesPlaceType);

    
    if (filtered.length) merged = filtered;
    else merged = original; 
  }
  merged = filterBySide(merged, side, fullVB);
  merged = rankByTokens(merged, topic);

  return merged;
}
