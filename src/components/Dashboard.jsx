import { useMemo } from 'react';
import TopNav from './TopNav.jsx';
import Btn from './ui/Btn.jsx';
import Pill from './ui/Pill.jsx';
import Empty from './ui/Empty.jsx';
import Input from './ui/Input.jsx';
import BrandChip from './ui/BrandChip.jsx';
import DaysChip from './ui/DaysChip.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import { I } from './icons/index.jsx';
import { BRANDS, getBrand, STATUS_TOKEN } from '../lib/constants.js';
import { fx, fmtDate, T } from '../lib/utils.js';
import { calcProgress } from '../lib/dataModel.js';

const SORT_OPTS = [
  { key: "createdAt",   label: "Creación" },
  { key: "openingDate", label: "Apertura" },
  { key: "name",        label: "Nombre"   },
  { key: "brand",       label: "Marca"    },
];

const ARCHIVE_OPTS = [
  { key: "active",   label: "Activas"    },
  { key: "archived", label: "Archivadas" },
  { key: "all",      label: "Todas"      },
];

export default function Dashboard({ projects, onOpen, onNew, filter, setFilter, sortBy, setSortBy, query, setQuery, archiveView, setArchiveView, syncing, syncError, onLogout, userEmail }) {
  const list = useMemo(() => {
    let r = projects;
    if (archiveView === "active")   r = r.filter(p => !p.archived);
    else if (archiveView === "archived") r = r.filter(p => p.archived);
    if (filter !== "all") r = r.filter(p => p.brand === filter);
    if (query.trim()) { const q = query.toLowerCase(); r = r.filter(p => (p.name ?? "").toLowerCase().includes(q) || p.localNumber?.toLowerCase().includes(q)); }
    return [...r].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "brand") return a.brand.localeCompare(b.brand);
      if (sortBy === "openingDate") { if (!a.openingDate) return 1; if (!b.openingDate) return -1; return a.openingDate.localeCompare(b.openingDate); }
      return b.createdAt - a.createdAt;
    });
  }, [projects, filter, archiveView, sortBy, query]);

  const brandCards = useMemo(() => {
    const active = projects.filter(p => !p.archived);
    return [
      ...BRANDS.map(b => ({ ...b, count: active.filter(p => p.brand === b.id).length })),
      { id: "all", name: "Total", accent: "var(--tx-3)", count: active.length },
    ];
  }, [projects]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <TopNav onNew={onNew} syncing={syncing} syncError={syncError} onLogout={onLogout} userEmail={userEmail} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px var(--pp) 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
          {brandCards.map(b => {
            const active = filter === b.id;
            return (
              <div key={b.id} onClick={() => setFilter(active && b.id !== "all" ? "all" : b.id)}
                style={{ background: "var(--bg-elev)", border: `1px solid ${active ? "var(--bd-strong)" : "var(--bd)"}`, borderTop: `3px solid ${b.accent}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: T }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--tx-3)", letterSpacing: .5, textTransform: "uppercase", marginBottom: 6 }}>{b.name}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--tx)", letterSpacing: -1, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{b.count}</div>
                <div style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 4 }}>obras</div>
              </div>
            );
          })}
        </div>
        <div style={fx({ gap: 6, marginBottom: 14, flexWrap: "wrap" })}>
          <div style={{ position: "relative", flex: "1 1 160px", minWidth: 0 }}>
            <I.Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--tx-3)", pointerEvents: "none" }} />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar obra…" style={{ paddingLeft: 32 }} />
          </div>
          <div style={fx({ gap: 2, background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 8, padding: 2 })}>
            {ARCHIVE_OPTS.map(o => (
              <button key={o.key} onClick={() => setArchiveView(o.key)} style={{ padding: "5px 10px", fontSize: 12, fontWeight: 500, background: archiveView === o.key ? "var(--bg-soft)" : "transparent", color: archiveView === o.key ? "var(--tx)" : "var(--tx-3)", border: "none", borderRadius: 6, cursor: "pointer" }}>{o.label}</button>
            ))}
          </div>
          <div style={fx({ gap: 2, background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 8, padding: 2 })}>
            {SORT_OPTS.map(o => (
              <button key={o.key} onClick={() => setSortBy(o.key)} style={{ padding: "5px 10px", fontSize: 12, fontWeight: 500, background: sortBy === o.key ? "var(--bg-soft)" : "transparent", color: sortBy === o.key ? "var(--tx)" : "var(--tx-3)", border: "none", borderRadius: 6, cursor: "pointer" }}>{o.label}</button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--tx-3)" }}>{list.length} obras</span>
        </div>
        {list.length === 0
          ? <Empty icon={<I.Building size={20} />} title="Sin obras" hint="Crea la primera obra arriba" action={<Btn variant="primary" icon={<I.Plus size={14} />} onClick={onNew}>Nueva obra</Btn>} />
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
              {list.map(p => <ProjectCard key={p.id} project={p} onClick={() => onOpen(p.id)} />)}
            </div>}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const b = getBrand(project.brand);
  const pct = calcProgress(project);
  const isArchived = !!project.archived;
  const recent = (() => {
    const ts = Math.max(
      project._srv ? new Date(project._srv).getTime() : 0,
      project.history?.[0]?.t ?? 0,
    );
    return !isArchived && ts > 0 && Date.now() - ts < 4 * 60 * 60_000;
  })();
  return (
    <div onClick={onClick} className="fu"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 12, padding: 16, cursor: "pointer", position: "relative", overflow: "hidden", transition: T, opacity: isArchived ? 0.55 : 1 }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--bd-strong)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.05)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--bd)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: isArchived ? "var(--tx-3)" : b.accent }} />
      {recent && <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 2px var(--bg-elev)" }} />}
      <div style={fx({ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 })}>
        <BrandChip id={project.brand} />
        {isArchived
          ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--tx-3)", background: "var(--bg-soft)", borderRadius: 5, padding: "3px 7px", letterSpacing: .3, textTransform: "uppercase" }}>Archivada</span>
          : <Pill token={STATUS_TOKEN[project.status]} size="sm" dot>{project.status}</Pill>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)", marginBottom: project.localNumber ? 2 : 10, letterSpacing: -.3 }}>{project.name || "Sin nombre"}</div>
      {project.localNumber && <div style={{ fontSize: 12, color: "var(--tx-3)", marginBottom: 10 }}>{project.localNumber}{project.localArea ? ` · ${project.localArea}` : ""}</div>}
      {project.deliveryDate && (
        <div style={fx({ gap: 8, background: "var(--bg-soft)", borderRadius: 8, padding: "6px 10px", marginBottom: 8 })}>
          <span style={{ fontSize: 11, color: "var(--tx-3)" }}>Entrega</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{fmtDate(project.deliveryDate)}</span>
          <DaysChip date={project.deliveryDate} />
        </div>
      )}
      {project.openingDate && (
        <div style={fx({ gap: 8, background: "var(--bg-soft)", borderRadius: 8, padding: "6px 10px", marginBottom: 8 })}>
          <span style={{ fontSize: 11, color: "var(--tx-3)" }}>Apertura</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{fmtDate(project.openingDate)}</span>
          <DaysChip date={project.openingDate} />
        </div>
      )}
      {pct > 0 && <ProgressBar value={pct} height={4} />}
    </div>
  );
}
