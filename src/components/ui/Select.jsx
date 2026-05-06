export default function Select({ children, style, ...rest }) {
  return (
    <select {...rest} style={{ width: "100%", height: 36, padding: "0 12px", background: "var(--bg-elev)", color: "var(--tx)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 13, outline: "none", cursor: "pointer", ...style }}>
      {children}
    </select>
  );
}
