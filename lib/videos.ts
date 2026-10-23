// Video links centres can add: YouTube (played in place on click) and Instagram (opened as a link,
// because its embed sets tracking cookies and we promise a cookieless site).
export type Video = { kind: "youtube"; id: string; url: string } | { kind: "instagram"; url: string };

export function parseVideo(raw: string): Video | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return /^[\w-]{11}$/.test(id) ? { kind: "youtube", id, url: u.toString() } : null;
  }
  if (host === "youtube.com") {
    const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ?? "";
    return /^[\w-]{11}$/.test(id) ? { kind: "youtube", id, url: u.toString() } : null;
  }
  if (host === "instagram.com" && /^\/(reel|reels|p|tv)\/[\w-]+/.test(u.pathname)) {
    return { kind: "instagram", url: `https://www.instagram.com${u.pathname}` };
  }
  return null;
}
