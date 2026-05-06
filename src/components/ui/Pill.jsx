import { tc } from '../../lib/utils.js';

export default function Pill({ token, children, dot = false, size = "md", style, onClick }) {
  const c = tc(token);
  const sz = { sm: { padding: "2px 8px", fontSize: 11 }, md: { padding: "3px 10px", fontSize: 12 }, lg: { padding: "5px 12px", fontSize: 13 } }[size] ?? {};
  return (
    <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap", background: c.bg, color: c.fg, cursor: onClick ? "pointer" : "default", ...sz, ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.fg }} />}
      {children}
    </span>
  );
}
