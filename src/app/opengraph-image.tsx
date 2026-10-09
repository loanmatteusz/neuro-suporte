import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const colors = ["#F0694F", "#F6B843", "#3DBE9C", "#8E7BD8", "#EC6C9A"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FBF8F3", color: "#26323B" }}>
        <div style={{ display: "flex", gap: 24 }}>
          {colors.map((c) => <div key={c} style={{ width: 96, height: 96, borderRadius: 28, background: c, opacity: 0.85 }} />)}
        </div>
        <div style={{ marginTop: 48, fontSize: 84, fontWeight: 800 }}>{siteConfig.name}</div>
        <div style={{ marginTop: 16, fontSize: 36, color: "#5B6670", maxWidth: 900, textAlign: "center" }}>{siteConfig.defaults.courseSubtitle}</div>
      </div>
    ),
    size,
  );
}
