export default function Avatar({ name = "?", size = 24 }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360;
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: Math.max(9, size * .44), fontWeight: 700, background: `oklch(0.85 0.06 ${hue})`, color: `oklch(0.32 0.08 ${hue})` }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
