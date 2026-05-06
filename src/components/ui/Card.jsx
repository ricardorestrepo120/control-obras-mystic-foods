import { T } from '../../lib/utils.js';

export default function Card({ children, style, padded = true, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 14, padding: padded ? 20 : 0, transition: T, cursor: onClick ? "pointer" : "default", ...style }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.borderColor = "var(--bd-strong)"; e.currentTarget.style.transform = "translateY(-1px)"; } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.borderColor = "var(--bd)"; e.currentTarget.style.transform = "translateY(0)"; } : undefined}
    >
      {children}
    </div>
  );
}
