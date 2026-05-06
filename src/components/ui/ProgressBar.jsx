export default function ProgressBar({ value, height = 6, style }) {
  return (
    <div style={{ position: "relative", height, background: "var(--bd)", borderRadius: 999, overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${Math.min(100, Math.max(0, value))}%`, background: "var(--accent)", transition: "width .3s ease-out" }} />
    </div>
  );
}
