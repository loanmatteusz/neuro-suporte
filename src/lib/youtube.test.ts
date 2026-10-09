import { describe, expect, test } from "vitest";
import { extractYouTubeId, youtubeEmbedUrl, youtubeUrlSchema } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  test.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://www.youtube.com/watch?list=PL123&v=${ID}&si=abc`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=xyz&t=10`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
    `https://www.youtube.com/live/${ID}`,
    `youtube.com/watch?v=${ID}`,
    `  https://youtu.be/${ID}  `,
    ID,
  ])("aceita %s", (url) => {
    expect(extractYouTubeId(url)).toBe(ID);
  });

  test.each([
    "",
    "   ",
    "não é link",
    "https://vimeo.com/123456",
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://evil.com/youtu.be/${ID}`,
    "https://www.youtube.com/watch?v=curto",
    "https://www.youtube.com/watch?v=comprido-demais-123",
    "https://www.youtube.com/channel/UC123",
    "javascript:alert(1)",
  ])("rejeita %s", (url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

describe("youtubeUrlSchema", () => {
  test("transforma em ID", () => {
    expect(youtubeUrlSchema.parse(`https://youtu.be/${ID}`)).toBe(ID);
  });
  test("mensagem amigável em português", () => {
    const r = youtubeUrlSchema.safeParse("https://vimeo.com/1");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Cole um link válido do YouTube.");
  });
});

test("youtubeEmbedUrl usa youtube-nocookie", () => {
  expect(youtubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}?rel=0`);
});
