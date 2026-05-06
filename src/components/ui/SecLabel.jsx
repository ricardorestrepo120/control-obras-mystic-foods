import { fx } from '../../lib/utils.js';

export default function SecLabel({ children, action, style }) {
  return (
    <div style={fx({ gap: 8, marginBottom: 12, ...style })}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", letterSpacing: .6, textTransform: "uppercase" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "var(--bd)" }} />
      {action}
    </div>
  );
}
