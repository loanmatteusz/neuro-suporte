import { z } from "zod";

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const PATH_PREFIXES = ["embed", "shorts", "live", "v"];

export function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (ID_RE.test(value)) return value;

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  let candidate: string | null = null;
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.hostname.toLowerCase() === "youtu.be") {
    candidate = segments[0] ?? null;
  } else if (segments[0] === "watch") {
    candidate = url.searchParams.get("v");
  } else if (PATH_PREFIXES.includes(segments[0] ?? "")) {
    candidate = segments[1] ?? null;
  }
  return candidate && ID_RE.test(candidate) ? candidate : null;
}

export const youtubeUrlSchema = z.string().transform((value, ctx) => {
  const id = extractYouTubeId(value);
  if (!id) {
    ctx.addIssue({ code: "custom", message: "Cole um link válido do YouTube." });
    return z.NEVER;
  }
  return id;
});

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}
