import { useState, useMemo, useEffect } from 'react';
import Card from '../ui/Card.jsx';
import SecLabel from '../ui/SecLabel.jsx';
import Pill from '../ui/Pill.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Input from '../ui/Input.jsx';
import Lbl from '../ui/Lbl.jsx';
import Empty from '../ui/Empty.jsx';
import Avatar from '../ui/Avatar.jsx';
import AssigneeInput from '../ui/AssigneeInput.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import DaysChip from '../ui/DaysChip.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, tc, fmtDateLong } from '../../lib/utils.js';
import { addHistory } from '../../lib/dataModel.js';

export default function ProjectApertura({ draft, upd, setDraft, readOnly = false }) {
  const items = draft.aperturaItems ?? [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", assignee: "" });
  const [filter, setFilter] = useState("all");
  const assignees = useMemo(() => [...new Set(items.map(x => x.assignee).filter(Boolean))].sort(), [items]);
  useEffect(() => { if (filter !== "all" && !assignees.includes(filter)) setFilter("all"); }, [assignees, filter]);
  const filtered = filter === "all" ? items : items.filter(x => x.assignee === filter);
  const ok    = filtered.filter(x => x.state === "OK").length;
  const falta = filtered.filter(x => x.state === "Falta").length;
  const pct   = filtered.length ? Math.round(ok / filtered.length * 100) : 0;

  const addItem = () => {
    if (!form.name.trim()) return;
    upd("aperturaItems", prev => [...prev, { id: `ap-${crypto.randomUUID()}`, name: form.name.trim(), state: null, assignee: form.assignee.trim() || "" }]);
    setForm({ name: "", assignee: "" }); setAdding(false);
  };

  const toggleState = (id, state) => {
    if (readOnly) return;
    const it = items.find(x => x.id === id);
    if (!it) return;
    const next = it.state === state ? null : state;
    setDraft(d => addHistory(
      { ...d, aperturaItems: d.aperturaItems.map(x => x.id === id ? { ...x, state: next } : x) },
      { kind: "apertura", text: `${it.name}: ${it.state || "—"} → ${next || "—"}`, meta: { item: it.name, from: it.state, to: next } }
    ));
  };

  const patch = (id, ch) => upd("aperturaItems", prev => prev.map(x => x.id === id ? { ...x, ...ch } : x));

  return (
    <div className="fu" style={col({ gap: 14 })}>
      <Card style={{ padding: 18 }}>
        <div style={fx({ justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14, flexWrap: "wrap" })}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", letterSpacing: .4, textTransform: "uppercase", marginBottom: 4 }}>Listo para abrir</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--tx)", letterSpacing: -1, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{pct}%</div>
            <div style={{ fontSize: 12, color: "var(--tx-3)", marginTop: 4 }}>{ok} de {filtered.length} items completos</div>
          </div>
          {draft.openingDate && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-3)", letterSpacing: .4, textTransform: "uppercase", marginBottom: 4 }}>Apertura</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--tx)" }}>{fmtDateLong(draft.openingDate)}</div>
              <div style={{ marginTop: 6 }}><DaysChip date={draft.openingDate} /></div>
            </div>
          )}
        </div>
        {filtered.length > 0 && <ProgressBar value={pct} height={6} />}
        <div style={fx({ gap: 14, marginTop: 14, flexWrap: "wrap" })}>
          {[{ label: "OK", value: ok, token: "ok" }, { label: "Falta", value: falta, token: "danger" }, { label: "Sin estado", value: filtered.length - ok - falta }].map(s => {
            const c = s.token ? tc(s.token) : null;
            return <div key={s.label} style={fx({ gap: 6 })}><span style={{ width: 8, height: 8, borderRadius: 2, background: c ? c.fg : "var(--bd-strong)", flexShrink: 0 }} /><span style={{ fontSize: 12, color: "var(--tx-3)" }}>{s.label}</span><span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", fontVariantNumeric: "tabular-nums" }}>{s.value}</span></div>;
          })}
        </div>
      </Card>
      {assignees.length > 0 && (
        <div style={fx({ gap: 8, flexWrap: "wrap" })}>
          <span style={{ fontSize: 12, color: "var(--tx-3)", fontWeight: 500 }}>Responsable:</span>
          {[{ id: "all", label: `Todos · ${items.length}` }, ...assignees.map(n => ({ id: n, label: `${n} · ${items.filter(x => x.assignee === n).length}` }))].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "4px 11px", fontSize: 12, fontWeight: 500, background: filter === f.id ? "var(--accent)" : "var(--bg-elev)", color: filter === f.id ? "var(--bg)" : "var(--tx-2)", border: `1px solid ${filter === f.id ? "var(--accent)" : "var(--bd)"}`, borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {f.id !== "all" && <Avatar name={f.id} size={16} />}{f.label}
            </button>
          ))}
        </div>
      )}
      <Card>
        <SecLabel action={!readOnly && !adding && <Btn size="sm" variant="soft" icon={<I.Plus size={13} />} onClick={() => setAdding(true)}>Agregar item</Btn>}>Checklist de apertura</SecLabel>
        {adding && (
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <Lbl>Nuevo item *</Lbl>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: Letrero exterior instalado" autoFocus onKeyDown={e => { if (e.key === "Enter") addItem(); }} />
            <div style={{ marginTop: 10 }}><Lbl>Responsable</Lbl><AssigneeInput value={form.assignee} onChange={v => setForm(f => ({ ...f, assignee: v }))} suggestions={assignees} /></div>
            <div style={fx({ gap: 8, marginTop: 12 })}>
              <Btn variant="primary" size="sm" onClick={addItem} disabled={!form.name.trim()}>Agregar</Btn>
              <Btn variant="text" size="sm" onClick={() => { setAdding(false); setForm({ name: "", assignee: "" }); }}>Cancelar</Btn>
            </div>
          </div>
        )}
        {filtered.length === 0 && !adding && <Empty icon={<I.Key size={20} />} title="Sin items" hint="Agrega lo que debe estar listo para abrir el local" />}
        <div style={col({ gap: 6 })}>
          {filtered.map(it => <AperturaRow key={it.id} item={it} suggestions={assignees} readOnly={readOnly} onState={s => toggleState(it.id, s)} onPatch={ch => patch(it.id, ch)} onRemove={() => upd("aperturaItems", prev => prev.filter(x => x.id !== it.id))} />)}
        </div>
      </Card>
    </div>
  );
}

function AperturaRow({ item, suggestions, onState, onPatch, onRemove, readOnly = false }) {
  const [editAsgn, setEditAsgn] = useState(false);
  if (readOnly) {
    const tk = item.state === "OK" ? "ok" : item.state === "Falta" ? "danger" : null;
    return (
      <div style={fx({ gap: 10, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10, flexWrap: "wrap" })}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--tx)" }}>{item.name}</div>
        {item.assignee && <span style={fx({ gap: 5, fontSize: 11, color: "var(--tx-3)" })}><Avatar name={item.assignee} size={18} />{item.assignee}</span>}
        {item.state ? <Pill token={tk} dot>{item.state}</Pill> : <span style={{ fontSize: 12, color: "var(--tx-4)" }}>Sin asignar</span>}
      </div>
    );
  }
  return (
    <div style={fx({ gap: 8, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10, flexWrap: "wrap" })}>
      <input value={item.name} onChange={e => onPatch({ name: e.target.value })} style={{ flex: "1 1 160px", minWidth: 0, border: "none", background: "transparent", fontSize: 13, color: "var(--tx)", outline: "none", fontWeight: 500 }} />
      {!editAsgn && item.assignee && <button onClick={() => setEditAsgn(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px 3px 3px", fontSize: 11, fontWeight: 500, background: "var(--bg-elev)", color: "var(--tx-2)", border: "1px solid var(--bd)", borderRadius: 999, cursor: "pointer" }}><Avatar name={item.assignee} size={18} />{item.assignee}</button>}
      {!editAsgn && !item.assignee && <IconBtn icon={<I.User size={13} />} onClick={() => setEditAsgn(true)} title="Asignar" />}
      {editAsgn && <div style={fx({ gap: 4 })}><AssigneeInput value={item.assignee || ""} onChange={v => onPatch({ assignee: v })} suggestions={suggestions} compact autoFocus /><IconBtn icon={<I.Check size={13} />} onClick={() => setEditAsgn(false)} title="Listo" /></div>}
      <div style={fx({ gap: 4 })}>
        {[{ key: "OK", token: "ok" }, { key: "Falta", token: "danger" }].map(s => { const active = item.state === s.key, c = tc(s.token); return <button key={s.key} onClick={() => onState(s.key)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 500, background: active ? c.bg : "transparent", color: active ? c.fg : "var(--tx-3)", border: `1px solid ${active ? "transparent" : "var(--bd)"}`, borderRadius: 999, cursor: "pointer" }}>{s.key}</button>; })}
      </div>
      <IconBtn icon={<I.Trash size={13} />} onClick={onRemove} title="Eliminar" />
    </div>
  );
}
