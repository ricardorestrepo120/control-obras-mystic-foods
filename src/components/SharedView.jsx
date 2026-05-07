import { useState } from 'react';
import Card from './ui/Card.jsx';
import SecLabel from './ui/SecLabel.jsx';
import Pill from './ui/Pill.jsx';
import Avatar from './ui/Avatar.jsx';
import DaysChip from './ui/DaysChip.jsx';
import ProjectStatus from './tabs/ProjectStatus.jsx';
import ProjectNotes from './tabs/ProjectNotes.jsx';
import ProjectApertura from './tabs/ProjectApertura.jsx';
import ProjectHistory from './tabs/ProjectHistory.jsx';
import { I } from './icons/index.jsx';
import { getBrand, STATUS_TOKEN } from '../lib/constants.js';
import { col, fx, fmtDate, fmtDateLong, parseLocalDate } from '../lib/utils.js';

const SHARED_TABS = [
  { id: "info",     label: "Información", Icon: p => <I.DocText  {...p} /> },
  { id: "status",   label: "Preliminares",Icon: p => <I.Layers   {...p} /> },
  { id: "notes",    label: "Notas",       Icon: p => <I.PenLine  {...p} /> },
  { id: "apertura", label: "Apertura",    Icon: p => <I.Key      {...p} /> },
  { id: "history",  label: "Historial",   Icon: p => <I.Activity {...p} /> },
];

const noop = () => {};

export default function SharedView({ project }) {
  const [tab, setTab] = useState("info");
  const brand = getBrand(project.brand);
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: "var(--accent)", color: "var(--bg)", padding: "16px var(--pp)" }}>
        <div style={fx({ maxWidth: 980, margin: "0 auto", gap: 10 })}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Logo size={14} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -.3 }}>Mystic Foods</div>
            <div style={{ fontSize: 9, fontWeight: 500, opacity: .7, letterSpacing: .4, textTransform: "uppercase" }}>Control de Obras · Reporte compartido</div>
          </div>
          <Pill token="info" size="sm">Solo lectura</Pill>
        </div>
      </div>
      <div style={{ height: 4, background: brand.accent }} />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px var(--pp) 80px" }}>
        <div style={fx({ gap: 6, marginBottom: 6, color: "var(--tx-2)", fontSize: 12, fontWeight: 500 })}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: brand.accent }} />{brand.name}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--tx)", letterSpacing: -.8, marginTop: 6 }}>{project.name}</div>
        <div style={fx({ flexWrap: "wrap", gap: 12, marginTop: 10, marginBottom: 18 })}>
          {project.localNumber && <span style={{ fontSize: 13, color: "var(--tx-2)" }}>{project.localNumber}{project.localArea ? ` · ${project.localArea}` : ""}</span>}
          <Pill token={STATUS_TOKEN[project.status]} dot>{project.status}</Pill>
          {project.openingDate && (
            <span style={fx({ gap: 6, fontSize: 13, color: "var(--tx-2)" })}>
              <I.Calendar size={14} /> Apertura {fmtDateLong(project.openingDate)}<DaysChip date={project.openingDate} />
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--bd)", overflowX: "auto" }}>
          {SHARED_TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 12px", marginBottom: -1, background: "transparent", color: tab === id ? "var(--tx)" : "var(--tx-3)", border: "none", borderBottom: `2px solid ${tab === id ? "var(--accent)" : "transparent"}`, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "color .12s" }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        {tab === "info"     && <SharedInfoView project={project} />}
        {tab === "status"   && <ProjectStatus   draft={project} upd={noop} setDraft={noop} readOnly />}
        {tab === "notes"    && <ProjectNotes    draft={project} upd={noop} readOnly />}
        {tab === "apertura" && <ProjectApertura draft={project} upd={noop} setDraft={noop} readOnly />}
        {tab === "history"  && <ProjectHistory  draft={project} />}
        <div style={{ marginTop: 32, padding: "16px 0", borderTop: "1px solid var(--bd)", textAlign: "center", fontSize: 11, color: "var(--tx-3)" }}>Reporte generado por Mystic Foods · Control de Obras</div>
      </div>
    </div>
  );
}

function SharedInfoView({ project }) {
  return (
    <div style={col({ gap: 14 })}>
      {project.notes && (
        <Card><SecLabel>Notas</SecLabel><div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{project.notes}</div></Card>
      )}
      {(project.contacts ?? []).length > 0 && (
        <Card>
          <SecLabel>Contactos</SecLabel>
          <div style={col({ gap: 8 })}>
            {project.contacts.map(c => (
              <div key={c.id} style={fx({ gap: 12, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10 })}>
                <Avatar name={c.name} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--tx-3)" }}>{[c.role, c.phone, c.email].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {project.startDate && project.openingDate && (
        <Card>
          <SecLabel>Cronograma</SecLabel>
          <TimelineMini start={project.startDate} end={project.openingDate} />
        </Card>
      )}
    </div>
  );
}

function TimelineMini({ start, end }) {
  const sd = parseLocalDate(start), ed = parseLocalDate(end);
  if (!sd || !ed) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const total = (ed - sd) / 86400000;
  if (total <= 0) return null;
  const elapsed = (today - sd) / 86400000;
  const pct = Math.min(100, Math.max(0, elapsed / total * 100));
  const overdue = today > ed, notStarted = today < sd;
  return (
    <div>
      <div style={{ position: "relative", height: 4, background: "var(--bd)", borderRadius: 999 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: overdue ? "var(--danger)" : "var(--accent)", borderRadius: 999 }} />
        {!notStarted && !overdue && <div style={{ position: "absolute", left: `${pct}%`, top: -4, transform: "translateX(-50%)", width: 12, height: 12, background: "var(--accent)", borderRadius: "50%", border: "2px solid var(--bg-elev)" }} />}
      </div>
      <div style={fx({ justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--tx-3)" })}>
        <span>{fmtDate(start)}</span>
        <span style={{ color: "var(--tx-2)", fontWeight: 600 }}>
          {notStarted ? `Inicia en ${Math.abs(~~elapsed)}d` : overdue ? `Vencida hace ${~~(elapsed - total)}d` : `Día ${~~elapsed} de ${~~total}`}
        </span>
        <span>{fmtDate(end)}</span>
      </div>
    </div>
  );
}
