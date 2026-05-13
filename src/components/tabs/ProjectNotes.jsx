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
import { I } from '../icons/index.jsx';
import { col, fx, tc, fmtDate, daysUntil } from '../../lib/utils.js';

export default function ProjectNotes({ draft, upd, readOnly = false }) {
  const list = draft.checklist ?? [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ text: "", rem: "", time: "", assignee: "" });
  const [filter, setFilter] = useState("all");
  const assignees = useMemo(() => [...new Set(list.map(x => x.assignee).filter(Boolean))].sort(), [list]);
  useEffect(() => { if (filter !== "all" && !assignees.includes(filter)) setFilter("all"); }, [assignees, filter]);
  const filtered = filter === "all" ? list : list.filter(x => x.assignee === filter);
  const pending = filtered.filter(x => !x.done);
  const done    = filtered.filter(x => x.done);
  const totalPending = list.filter(x => !x.done).length;
  const totalDone    = list.filter(x => x.done).length;
  const totalOverdue = list.filter(x => !x.done && x.reminder?.date && daysUntil(x.reminder.date) < 0).length;

  const addItem = () => {
    if (!form.text.trim()) return;
    upd("checklist", [...list, { id: `cl-${crypto.randomUUID()}`, text: form.text.trim(), done: false, assignee: form.assignee.trim() || "", reminder: form.rem ? { date: form.rem, time: form.time } : null }]);
    setForm({ text: "", rem: "", time: "", assignee: "" }); setAdding(false);
  };
  const patch = (id, ch) => upd("checklist", prev => prev.map(x => x.id === id ? { ...x, ...ch } : x));

  return (
    <div className="fu" style={col({ gap: 14 })}>
      <Card style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 10 }}>
          {[{ label: "Pendientes", value: totalPending }, { label: "Completadas", value: totalDone }, { label: "Vencidas", value: totalOverdue, token: totalOverdue ? "danger" : null }, { label: "Total", value: list.length }].map(s => {
            const c = s.token ? tc(s.token) : null;
            return <div key={s.label} style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "10px 14px", borderLeft: c ? `3px solid ${c.fg}` : "3px solid var(--bd)" }}>
              <div style={{ fontSize: 11, color: "var(--tx-3)", fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c ? c.fg : "var(--tx)", letterSpacing: -.5, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            </div>;
          })}
        </div>
      </Card>
      {assignees.length > 0 && (
        <div style={fx({ gap: 8, flexWrap: "wrap" })}>
          <span style={{ fontSize: 12, color: "var(--tx-3)", fontWeight: 500 }}>Responsable:</span>
          {[{ id: "all", label: `Todos · ${list.length}` }, ...assignees.map(n => ({ id: n, label: `${n} · ${list.filter(x => x.assignee === n).length}` }))].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "4px 11px", fontSize: 12, fontWeight: 500, background: filter === f.id ? "var(--accent)" : "var(--bg-elev)", color: filter === f.id ? "var(--bg)" : "var(--tx-2)", border: `1px solid ${filter === f.id ? "var(--accent)" : "var(--bd)"}`, borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {f.id !== "all" && <Avatar name={f.id} size={16} />}{f.label}
            </button>
          ))}
        </div>
      )}
      <Card>
        <SecLabel action={!readOnly && !adding && <Btn size="sm" variant="soft" icon={<I.Plus size={13} />} onClick={() => setAdding(true)}>Nuevo pendiente</Btn>}>Pendientes</SecLabel>
        {adding && (
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <Lbl>Pendiente *</Lbl>
            <Input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="ej: Revisar cotización de mobiliario" autoFocus onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) addItem(); }} />
            <div style={fx({ gap: 10, marginTop: 10, flexWrap: "wrap" })}>
              <div style={{ flex: "1 1 150px" }}><Lbl>Responsable</Lbl><AssigneeInput value={form.assignee} onChange={v => setForm(f => ({ ...f, assignee: v }))} suggestions={assignees} /></div>
              <div style={{ flex: "1 1 120px" }}><Lbl>Fecha</Lbl><Input type="date" value={form.rem}  onChange={e => setForm(f => ({ ...f, rem: e.target.value }))} /></div>
              <div style={{ flex: "1 1 90px" }}> <Lbl>Hora</Lbl> <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div style={fx({ gap: 8, marginTop: 12 })}>
              <Btn variant="primary" size="sm" onClick={addItem} disabled={!form.text.trim()}>Agregar</Btn>
              <Btn variant="text" size="sm" onClick={() => { setAdding(false); setForm({ text: "", rem: "", time: "", assignee: "" }); }}>Cancelar</Btn>
            </div>
          </div>
        )}
        {filtered.length === 0 && !adding && <Empty icon={<I.Check size={20} />} title="Sin pendientes" hint="Agrega tareas para esta obra" />}
        {pending.length > 0 && <div style={col({ gap: 6 })}>{pending.map(it => <ChecklistRow key={it.id} item={it} suggestions={assignees} readOnly={readOnly} onPatch={ch => patch(it.id, ch)} onRemove={() => upd("checklist", list.filter(x => x.id !== it.id))} />)}</div>}
        {done.length > 0 && <>
          <div style={{ marginTop: 14, marginBottom: 8, fontSize: 11, fontWeight: 600, color: "var(--tx-3)", letterSpacing: .4, textTransform: "uppercase" }}>Completadas · {done.length}</div>
          <div style={col({ gap: 6, opacity: .65 })}>{done.map(it => <ChecklistRow key={it.id} item={it} suggestions={assignees} readOnly={readOnly} onPatch={ch => patch(it.id, ch)} onRemove={() => upd("checklist", list.filter(x => x.id !== it.id))} />)}</div>
        </>}
      </Card>
    </div>
  );
}

function ChecklistRow({ item, suggestions, onPatch, onRemove, readOnly = false }) {
  const [editRem,  setEditRem]  = useState(false);
  const [editAsgn, setEditAsgn] = useState(false);
  const due = item.reminder?.date ? daysUntil(item.reminder.date) : null;
  const remToken = (!item.done && due !== null && due < 0) ? "danger" : (!item.done && due !== null && due <= 3) ? "warn" : "info";

  if (readOnly) return (
    <div style={fx({ gap: 10, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10, flexWrap: "wrap" })}>
      <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${item.done ? "var(--ok)" : "var(--bd-strong)"}`, background: item.done ? "var(--ok)" : "transparent", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.done && <I.Check size={11} sw={3} />}</div>
      <div style={{ flex: 1, fontSize: 13, color: "var(--tx)", textDecoration: item.done ? "line-through" : "none" }}>{item.text}</div>
      {item.assignee && <span style={fx({ gap: 5, fontSize: 11, color: "var(--tx-3)" })}><Avatar name={item.assignee} size={18} />{item.assignee}</span>}
      {item.reminder?.date && <Pill token={due !== null && due < 0 && !item.done ? "danger" : "info"} size="sm">{fmtDate(item.reminder.date)}</Pill>}
    </div>
  );

  return (
    <div style={fx({ gap: 8, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10, flexWrap: "wrap" })}>
      <button onClick={() => onPatch({ done: !item.done })} style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${item.done ? "var(--ok)" : "var(--bd-strong)"}`, background: item.done ? "var(--ok)" : "transparent", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        {item.done && <I.Check size={12} sw={3} />}
      </button>
      <input
        value={item.text ?? ""}
        onChange={e => onPatch({ text: e.target.value })}
        placeholder="Escribe el pendiente…"
        style={{ flex: "1 1 160px", minWidth: 0, border: "none", borderBottom: "1.5px solid transparent", background: "transparent", fontSize: 13, color: "var(--tx)", outline: "none", textDecoration: item.done ? "line-through" : "none", padding: "1px 0", transition: "border-color .12s" }}
        onFocus={e => { e.currentTarget.style.borderBottomColor = "var(--accent)"; }}
        onBlur={e  => { e.currentTarget.style.borderBottomColor = "transparent"; }}
      />
      {!editAsgn && item.assignee && <button onClick={() => setEditAsgn(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px 3px 3px", fontSize: 11, fontWeight: 500, background: "var(--bg-elev)", color: "var(--tx-2)", border: "1px solid var(--bd)", borderRadius: 999, cursor: "pointer" }}><Avatar name={item.assignee} size={18} />{item.assignee}</button>}
      {!editAsgn && !item.assignee && <IconBtn icon={<I.User size={13} />} onClick={() => setEditAsgn(true)} title="Asignar" />}
      {editAsgn && <div style={fx({ gap: 4 })}><AssigneeInput value={item.assignee || ""} onChange={v => onPatch({ assignee: v })} suggestions={suggestions} compact autoFocus /><IconBtn icon={<I.Check size={13} />} onClick={() => setEditAsgn(false)} title="Listo" /></div>}
      {!editRem && item.reminder?.date && <button onClick={() => setEditRem(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", fontSize: 11, fontWeight: 500, background: tc(remToken).bg, color: tc(remToken).fg, border: "none", borderRadius: 999, cursor: "pointer" }}><I.Calendar size={10} />{fmtDate(item.reminder.date)}{item.reminder.time && ` ${item.reminder.time}`}</button>}
      {!editRem && !item.reminder?.date && <IconBtn icon={<I.Calendar size={13} />} onClick={() => setEditRem(true)} title="Recordatorio" />}
      {editRem && (
        <div style={fx({ gap: 4 })}>
          <Input type="date" value={item.reminder?.date || ""} onChange={e => onPatch({ reminder: { ...item.reminder, date: e.target.value } })} style={{ height: 28, fontSize: 11, padding: "0 6px" }} />
          <Input type="time" value={item.reminder?.time || ""} onChange={e => onPatch({ reminder: { ...item.reminder, time: e.target.value } })} style={{ height: 28, fontSize: 11, padding: "0 6px", width: 80 }} />
          {item.reminder?.date && <IconBtn icon={<I.X size={12} />} onClick={() => { onPatch({ reminder: null }); setEditRem(false); }} title="Quitar" />}
          <IconBtn icon={<I.Check size={13} />} onClick={() => setEditRem(false)} title="Listo" />
        </div>
      )}
      <IconBtn icon={<I.Trash size={13} />} onClick={onRemove} title="Eliminar" />
    </div>
  );
}
