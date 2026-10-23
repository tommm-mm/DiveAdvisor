// Review helpers shared by server and client code (no server imports here).

export const CRITERIA = [
  { key: "safety", label: "Sicurezza" },
  { key: "equipment", label: "Attrezzatura" },
  { key: "briefing", label: "Briefing" },
  { key: "group", label: "Dimensione del gruppo" },
  { key: "environment", label: "Ambiente" },
  { key: "value", label: "Rapporto qualità/prezzo" },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]["key"];

export type Review = {
  id: string;
  dive_date: string;
  verified: boolean;
  text: string | null;
  owner_reply: string | null;
  owner_reply_at: string | null;
  created_at: string;
} & Record<`score_${CriterionKey}`, number>;

export type Rating = { review_count: number; avg_overall: number } & Record<`avg_${CriterionKey}`, number>;

export const reviewScore = (r: Review) =>
  CRITERIA.reduce((sum, c) => sum + r[`score_${c.key}`], 0) / CRITERIA.length;

// Verification codes are 8 chars, shown as XXXX-XXXX.
export const normalizeCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
