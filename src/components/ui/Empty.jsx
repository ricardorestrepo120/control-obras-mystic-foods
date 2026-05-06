import Card from './Card.jsx';

export default function Empty({ icon, title, hint, action }) {
  return (
    <Card style={{ padding: "40px 24px", textAlign: "center" }}>
      <div style={{ width: 44, height: 44, margin: "0 auto 14px", borderRadius: 10, background: "var(--bg-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--tx-3)" }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)", marginBottom: hint ? 4 : 0 }}>{title}</div>
      {hint   && <div style={{ fontSize: 12, color: "var(--tx-3)", marginBottom: action ? 16 : 0 }}>{hint}</div>}
      {action}
    </Card>
  );
}
