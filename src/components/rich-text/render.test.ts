import { expect, test } from "vitest";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { richTextExtensions } from "./extensions";

test("texto com HTML é escapado no render", () => {
  const html = renderToHTMLString({
    extensions: richTextExtensions,
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }] },
  });
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});
