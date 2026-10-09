const pairs = [
  ["ink on background", "#26323b", "#fbf8f3"],
  ["muted on background", "#5b6670", "#fbf8f3"],
  ["muted on surface", "#5b6670", "#ffffff"],
  ["white on primary", "#ffffff", "#1f7a66"],
  ["coral on coral-soft", "#b2432c", "#fde5df"],
  ["amber on amber-soft", "#8a5a00", "#fcf0d2"],
  ["mint on mint-soft", "#1d7863", "#ddf3ec"],
  ["lavender on lavender-soft", "#5b48a8", "#ece8fa"],
  ["pink on pink-soft", "#a8325f", "#fce4ee"],
];
const lum = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
let fail = false;
for (const [name, fg, bg] of pairs) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  const ratio = (a + 0.05) / (b + 0.05);
  const ok = ratio >= 4.5;
  if (!ok) fail = true;
  console.log(`${ok ? "OK  " : "FAIL"} ${ratio.toFixed(2)}  ${name}`);
}
process.exit(fail ? 1 : 0);
