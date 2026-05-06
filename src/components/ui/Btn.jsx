const BVARS = {
  primary: { background: "var(--accent)",     color: "var(--bg)",   border: "1px solid var(--accent)"      },
  ghost:   { background: "transparent",       color: "var(--tx)",   border: "1px solid var(--bd)"          },
  soft:    { background: "var(--bg-soft)",    color: "var(--tx)",   border: "1px solid transparent"        },
  text:    { background: "transparent",       color: "var(--tx-2)", border: "1px solid transparent"        },
  danger:  { background: "var(--danger-bg)",  color: "var(--danger)", border: "1px solid transparent"      },
};
const BSIZES = {
  sm: { height: 28, padding: "0 10px", fontSize: 12, gap: 6 },
  md: { height: 34, padding: "0 14px", fontSize: 13, gap: 8 },
};

export default function Btn({ children, variant = "ghost", size = "md", icon, onClick, disabled, style, title }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontWeight: 500, transition: "all .15s ease", opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer", ...BSIZES[size], ...BVARS[variant], ...style }}>
      {icon}{children}
    </button>
  );
}
