// Italian display labels for the coded values stored in dive_centers arrays.
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  diving: "Diving",
  scuola: "Scuola sub",
  negozio: "Negozio",
};

export const DIVE_TYPE_LABELS: Record<string, string> = {
  lago: "Lago",
  mare: "Mare",
  tecnico: "Tecnico",
  corsi: "Corsi",
};

export const SERVICE_LABELS: Record<string, string> = {
  noleggio: "Noleggio attrezzatura",
  corsi: "Corsi",
  ricarica: "Ricarica bombole",
  barca: "Uscite in barca",
};

// Certification levels a centre takes divers to; each level is also a depth band (ordered, shallow to deep).
export const LEVELS = [
  { value: "ow", label: "Open Water", depth: "18 m" },
  { value: "aow", label: "Advanced", depth: "30 m" },
  { value: "deep", label: "Deep", depth: "40 m" },
  { value: "tech1", label: "Tech 1", depth: "45 m" },
  { value: "tech2", label: "Tech 2", depth: "60 m" },
  { value: "tech3", label: "Tech 3", depth: "oltre 60 m" },
] as const;
export const LEVEL_LABELS: Record<string, string> = Object.fromEntries(LEVELS.map((l) => [l.value, `${l.label} · ${l.depth}`]));

// Deepest level offered, for summaries ("fino a 60 m").
export function maxDepth(levels: string[]) {
  const deepest = [...LEVELS].reverse().find((l) => levels.includes(l.value));
  return deepest ? (deepest.value === "tech3" ? "oltre 60 m" : `fino a ${deepest.depth}`) : null;
}

export const SPECIALTY_LABELS: Record<string, string> = {
  nitrox: "Nitrox",
  trimix: "Trimix",
  ccr: "Rebreather (CCR)",
  sidemount: "Sidemount",
  dpv: "Scooter (DPV)",
  notturna: "Notturna",
  relitti: "Relitti",
  grotte: "Grotte",
};

export const euro = (n: number | string) =>
  Number(n).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: Number(n) % 1 ? 2 : 0 });

export const LANGUAGE_LABELS: Record<string, string> = {
  it: "Italiano",
  en: "Inglese",
  de: "Tedesco",
  fr: "Francese",
  es: "Spagnolo",
};

export const label = (map: Record<string, string>, value: string) => map[value] ?? value;

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Federations offered in forms; keep in sync with ALLOWED.federazioni in scripts/seed.mts.
export const FEDERATIONS = ["PADI", "SSI", "CMAS", "FIPSAS", "TDI", "SDI", "IANTD", "GUE", "NAUI", "RAID", "UISP", "ANIS"];
