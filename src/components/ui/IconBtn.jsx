export default function IconBtn({ icon, onClick, title, danger = false, size = 30 }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid transparent", borderRadius: 7, cursor: "pointer", color: danger ? "var(--danger)" : "var(--tx-3)", transition: "all .15s ease", flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? "var(--danger-bg)" : "var(--bg-soft)"; e.currentTarget.style.color = danger ? "var(--danger)" : "var(--tx)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = danger ? "var(--danger)" : "var(--tx-3)"; }}>
      {icon}
    </button>
  );
}
