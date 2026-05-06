export default function Toast({ visible, children }) {
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : 10}px)`, opacity: visible ? 1 : 0, transition: "all .25s cubic-bezier(.34,1.56,.64,1)", pointerEvents: "none", zIndex: 9999, background: "var(--accent)", color: "var(--bg)", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
      {children}
    </div>
  );
}
