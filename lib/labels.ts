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
  nitrox: "Nitrox",
  trimix: "Trimix",
};

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
