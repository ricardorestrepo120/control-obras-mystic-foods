import { useState, useMemo } from 'react';
import Card from '../ui/Card.jsx';
import SecLabel from '../ui/SecLabel.jsx';
import Pill from '../ui/Pill.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Input from '../ui/Input.jsx';
import Lbl from '../ui/Lbl.jsx';
import { I } from '../icons/index.jsx';
import { ITEM_STATES } from '../../lib/constants.js';
import { col, fx, tc } from '../../lib/utils.js';
import { addHistory } from '../../lib/dataModel.js';

export default function ProjectStatus({ draft, upd, setDraft, readOnly = false }) {
  const items = draft.statusItems ?? [];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const counts = useMemo(() => ITEM_STATES.reduce((a, s) => ({ ...a, [s.key]: items.filter(x => x.state === s.key).length }), {}), [items]);

  const toggleState = (id, state) => {
    if (readOnly) return;
    const item = items.find(x => x.id === id);
    if (!item) return;
    const next = item.state === state ? null : state;
    setDraft(d => addHistory(
      { ...d, statusItems: d.statusItems.map(x => x.id === id ? { ...x, state: next } : x) },
      { kind: "plano", text: `${item.name}: ${item.state || "—"} → ${next || "—"}`, meta: { plano: item.name, from: item.state, to: next } }
    ));
  };

  const addItem = () => {
    if (!newName.trim()) return;
    upd("statusItems", [...items, { id: `c-${Date.now()}`, name: newName.trim(), state: null, notes: "", custom: true }]);
    setNewName(""); setAdding(false);
  };

  return (
    <div className="fu" style={col({ gap: 14 })}>
      <Card style={{ padding: 16 }}>
        <SecLabel>Resumen de preliminares</SecLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
          {ITEM_STATES.map(s => { const c = tc(s.token); return <div key={s.key} style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${c.fg}` }}><div style={{ fontSize: 11, color: "var(--tx-3)", fontWeight: 500, marginBottom: 4 }}>{s.key}</div><div style={{ fontSize: 22, fontWeight: 700, color: "var(--tx)", letterSpacing: -.5, fontVariantNumeric: "tabular-nums" }}>{counts[s.key] || 0}</div></div>; })}
          <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid var(--bd-strong)" }}><div style={{ fontSize: 11, color: "var(--tx-3)", fontWeight: 500, marginBottom: 4 }}>Sin asignar</div><div style={{ fontSize: 22, fontWeight: 700, color: "var(--tx)", letterSpacing: -.5 }}>{items.filter(x => !x.state).length}</div></div>
        </div>
      </Card>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bd)" }}>
          <div style={fx({ gap: 8 })}>
            <SecLabel style={{ marginBottom: 0, flex: 1 }}>Estado de preliminares</SecLabel>
            {!readOnly && !adding && <Btn size="sm" variant="soft" icon={<I.Plus size={13} />} onClick={() => setAdding(true)}>Agregar item</Btn>}
          </div>
        </div>
        {adding && (
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bd)", background: "var(--bg-soft)" }}>
            <Lbl>Nombre del item *</Lbl>
            <div style={fx({ gap: 8 })}>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ej: Señalización, Cimentación…" autoFocus onKeyDown={e => { if (e.key === "Enter") addItem(); }} />
              <Btn variant="primary" size="sm" onClick={addItem} disabled={!newName.trim()}>Agregar</Btn>
              <Btn variant="text" size="sm" onClick={() => { setAdding(false); setNewName(""); }}>Cancelar</Btn>
            </div>
          </div>
        )}
        {items.map((it, idx) => (
          <div key={it.id} style={{ padding: "14px 18px", borderBottom: idx < items.length - 1 ? "1px solid var(--bd)" : "none", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={fx({ gap: 12, flexWrap: "wrap" })}>
              <div style={fx({ flex: "1 1 160px", gap: 6, minWidth: 0 })}>
                {it.custom && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--tx-4)", background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>custom</span>}
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>{it.name}</span>
              </div>
              {readOnly
                ? it.state ? <Pill token={ITEM_STATES.find(s => s.key === it.state)?.token} dot>{it.state}</Pill> : <span style={{ fontSize: 12, color: "var(--tx-4)" }}>Sin asignar</span>
                : <div style={fx({ gap: 4, flexWrap: "wrap" })}>
                    {ITEM_STATES.map(s => { const active = it.state === s.key, c = tc(s.token); return <button key={s.key} onClick={() => toggleState(it.id, s.key)} style={{ padding: "5px 11px", fontSize: 12, fontWeight: 500, background: active ? c.bg : "transparent", color: active ? c.fg : "var(--tx-3)", border: `1px solid ${active ? "transparent" : "var(--bd)"}`, borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>{active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.fg }} />}{s.key}</button>; })}
                    {it.custom && <IconBtn icon={<I.Trash size={13} />} onClick={() => upd("statusItems", items.filter(x => x.id !== it.id))} title="Eliminar" danger />}
                  </div>}
            </div>
            {!readOnly && <Input value={it.notes || ""} onChange={e => upd("statusItems", items.map(x => x.id === it.id ? { ...x, notes: e.target.value } : x))} placeholder="Notas (opcional)" style={{ height: 34, fontSize: 12 }} />}
          </div>
        ))}
      </Card>
    </div>
  );
}
