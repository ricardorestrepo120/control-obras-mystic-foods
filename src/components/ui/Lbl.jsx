export default function Lbl({ children, style }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-2)", marginBottom: 6, ...style }}>
      {children}
    </div>
  );
}
