export const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

export const parseLocalDate = s => {
  if (!s || typeof s !== "string") return null;
  const pts = s.split("-").map(Number);
  if (pts.length !== 3 || pts.some(isNaN)) return null;
  return new Date(pts[0], pts[1] - 1, pts[2]);
};

export const daysUntil = s => {
  const d = parseLocalDate(s);
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};

export const fmtDate = s => {
  const d = parseLocalDate(s);
  if (!d) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const fmtDateLong = s => {
  const d = parseLocalDate(s);
  if (!d) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const relTime = t => {
  const s = Math.max(0, (Date.now() - t) / 1e3);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${~~(s / 60)}m`;
  if (s < 86400) return `hace ${~~(s / 3600)}h`;
  const d = ~~(s / 86400);
  if (d < 30) return `hace ${d}d`;
  const mo = ~~(d / 30);
  return `hace ${mo} ${mo === 1 ? "mes" : "meses"}`;
};

export const pad2 = n => String(n).padStart(2, "0");

export const TC = {
  ok:     { fg: "var(--ok)",     bg: "var(--ok-bg)"     },
  warn:   { fg: "var(--warn)",   bg: "var(--warn-bg)"   },
  danger: { fg: "var(--danger)", bg: "var(--danger-bg)" },
  info:   { fg: "var(--info)",   bg: "var(--info-bg)"   },
};

export const tc = t => TC[t] ?? { fg: "var(--tx-2)", bg: "var(--bg-soft)" };

export const fx  = (ex = {}) => ({ display: "flex", alignItems: "center", ...ex });
export const col = (ex = {}) => ({ display: "flex", flexDirection: "column", ...ex });

export const T = "all .15s ease";
