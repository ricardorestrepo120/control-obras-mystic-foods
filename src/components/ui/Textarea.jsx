export default function Textarea({ style, ...rest }) {
  return (
    <textarea {...rest}
      style={{ width: "100%", padding: "10px 12px", background: "var(--bg-elev)", color: "var(--tx)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", minHeight: 80, fontFamily: "inherit", transition: "border-color .12s", ...style }}
      onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
      onBlur={e  => e.currentTarget.style.borderColor = "var(--bd)"}
    />
  );
}
