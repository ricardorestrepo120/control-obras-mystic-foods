import { useState, useMemo } from 'react';
import Card from '../ui/Card.jsx';
import SecLabel from '../ui/SecLabel.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Lbl from '../ui/Lbl.jsx';
import Empty from '../ui/Empty.jsx';
import Pill from '../ui/Pill.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, fmtDateLong } from '../../lib/utils.js';

const ESTADOS = ["Pendiente", "En progreso", "Completada"];

const ESTADO_TOKEN = {
  "Pendiente":   null,
  "En progreso": "warn",
  "Completada":  "ok",
};

const freshFase = () => ({ nombre: "", fechaInicio: "", fechaFin: "", estado: "Pendiente", notas: "" });

export default function ProjectCronograma({ draft, setDraft, readOnly = false }) {
  const cronograma = draft.cronograma ?? [];

  const sorted = useMemo(
    () => [...cronograma].sort((a, b) => (a.fechaInicio || "").localeCompare(b.fechaInicio || "")),
    [cronograma]
  );

  const completadas = cronograma.filter(f => f.estado === "Completada").length;
  const progreso = cronograma.length > 0 ? Math.round(completadas / cronograma.length * 100) : 0;

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(freshFase);

  const openAdd = () => { setForm(freshFase()); setEditId(null); setAdding(true); };

  const openEdit = fase => {
    setForm({ nombre: fase.nombre, fechaInicio: fase.fechaInicio, fechaFin: fase.fechaFin, estado: fase.estado, notas: fase.notas ?? "" });
    setEditId(fase.id);
    setAdding(true);
  };

  const cancel = () => { setAdding(false); setEditId(null); setForm(freshFase()); };

  const save = () => {
    if (!form.nombre.trim()) return;
    const data = { ...form, nombre: form.nombre.trim(), notas: form.notas.trim() };
    if (editId) {
      setDraft(d => ({ ...d, cronograma: (d.cronograma ?? []).map(f => f.id === editId ? { ...f, ...data } : f) }));
    } else {
      setDraft(d => ({ ...d, cronograma: [...(d.cronograma ?? []), { id: `f-${crypto.randomUUID()}`, ...data, createdAt: Date.now() }] }));
    }
    cancel();
  };

  const remove = id => setDraft(d => ({ ...d, cronograma: (d.cronograma ?? []).filter(f => f.id !== id) }));

  return (
    <div className="fu" style={col({ gap: 14 })}>
      {!readOnly && !adding && (
        <div style={fx({ justifyContent: "flex-end" })}>
          <Btn variant="primary" size="sm" icon={<I.Plus size={13} />} onClick={openAdd}>
            Nueva fase
          </Btn>
        </div>
      )}

      {cronograma.length > 0 && (
        <Card>
          <SecLabel>Progreso general</SecLabel>
          <div style={fx({ gap: 12 })}>
            <div style={{ flex: 1, height: 8, background: "var(--bd)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progreso}%`, background: progreso === 100 ? "var(--ok)" : "var(--accent)", borderRadius: 999, transition: "width .3s ease" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)", minWidth: 36, textAlign: "right" }}>{progreso}%</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--tx-3)" }}>
            {completadas} de {cronograma.length} {cronograma.length === 1 ? "fase completada" : "fases completadas"}
          </div>
        </Card>
      )}

      {adding && (
        <Card style={{ padding: 18 }}>
          <SecLabel>{editId ? "Editar fase" : "Nueva fase"}</SecLabel>

          <div style={{ marginBottom: 12 }}>
            <Lbl>Nombre *</Lbl>
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="ej: Diseño, Construcción, Instalaciones eléctri…" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><Lbl>Fecha inicio</Lbl><Input type="date" value={form.fechaInicio} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} /></div>
            <div><Lbl>Fecha fin</Lbl><Input type="date" value={form.fechaFin} onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Lbl>Estado</Lbl>
            <div style={fx({ gap: 6, flexWrap: "wrap" })}>
              {ESTADOS.map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, estado: e }))}
                  style={{ padding: "5px 12px", borderRadius: 999, border: `1.5px solid ${form.estado === e ? "var(--accent)" : "var(--bd)"}`, background: form.estado === e ? "var(--accent)" : "transparent", color: form.estado === e ? "var(--bg)" : "var(--tx-2)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all .12s" }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Lbl>Notas</Lbl>
            <Textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones, responsable, pendientes…" style={{ minHeight: 72 }} />
          </div>

          <div style={fx({ gap: 8 })}>
            <Btn variant="primary" size="sm" onClick={save} disabled={!form.nombre.trim()}>
              {editId ? "Guardar cambios" : "Agregar fase"}
            </Btn>
            <Btn variant="text" size="sm" onClick={cancel}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {sorted.length === 0 && !adding && (
        <Empty icon={<I.Calendar size={20} />} title="Sin fases definidas"
          hint="Agrega las fases del cronograma para esta obra" />
      )}

      {sorted.map(fase => (
        <FaseCard key={fase.id} fase={fase} readOnly={readOnly}
          onEdit={() => openEdit(fase)} onRemove={() => remove(fase.id)} />
      ))}
    </div>
  );
}

function FaseCard({ fase, readOnly, onEdit, onRemove }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={fx({ gap: 12, padding: "14px 16px", borderBottom: fase.notas ? "1px solid var(--bd)" : "none", justifyContent: "space-between" })}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={fx({ gap: 8, marginBottom: fase.fechaInicio || fase.fechaFin ? 5 : 0 })}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>{fase.nombre}</span>
            <Pill token={ESTADO_TOKEN[fase.estado]}>{fase.estado}</Pill>
          </div>
          {(fase.fechaInicio || fase.fechaFin) && (
            <div style={fx({ gap: 5, fontSize: 12, color: "var(--tx-3)" })}>
              <I.Calendar size={11} />
              {fase.fechaInicio ? fmtDateLong(fase.fechaInicio) : "—"}
              <span style={{ opacity: .5 }}>→</span>
              {fase.fechaFin ? fmtDateLong(fase.fechaFin) : "—"}
            </div>
          )}
        </div>
        {!readOnly && (
          <div style={fx({ gap: 6, flexShrink: 0 })}>
            <IconBtn icon={<I.PenLine size={13} />} onClick={onEdit} title="Editar fase" />
            <IconBtn icon={<I.Trash size={13} />} onClick={onRemove} title="Eliminar fase" danger />
          </div>
        )}
      </div>
      {fase.notas && (
        <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--tx-2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
          {fase.notas}
        </div>
      )}
    </Card>
  );
}
