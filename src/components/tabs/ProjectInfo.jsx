import Card from '../ui/Card.jsx';
import SecLabel from '../ui/SecLabel.jsx';
import Pill from '../ui/Pill.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Select from '../ui/Select.jsx';
import Lbl from '../ui/Lbl.jsx';
import BrandChip from '../ui/BrandChip.jsx';
import DaysChip from '../ui/DaysChip.jsx';
import { I } from '../icons/index.jsx';
import { BRANDS, STATUS_LIST, STATUS_TOKEN } from '../../lib/constants.js';
import { fx, col, tc, fmtDate, fmtDateLong, parseLocalDate } from '../../lib/utils.js';

export default function ProjectInfo({ draft, isNew, upd, contactForm, setContactForm, saveContact }) {
  const brand = BRANDS.find(b => b.id === draft.brand) ?? BRANDS[0];
  return (
    <div className="fu" style={col({ gap: 14 })}>
      <Card style={{ padding: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: brand.accent }} />
        <BrandChip id={draft.brand} size="lg" />
        {isNew
          ? <Input value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Nombre de la obra (ej: Santafé · Local 214)" style={{ height: 44, fontSize: 20, fontWeight: 600, padding: "0 14px", marginTop: 8 }} />
          : <div style={{ fontSize: 24, fontWeight: 700, color: "var(--tx)", letterSpacing: -.8, marginTop: 6 }}>{draft.name}</div>}
        <div style={fx({ flexWrap: "wrap", gap: 12, marginTop: 10 })}>
          {draft.localNumber && <span style={{ fontSize: 13, color: "var(--tx-2)" }}>{draft.localNumber}{draft.localArea ? ` · ${draft.localArea}` : ""}</span>}
          <Pill token={STATUS_TOKEN[draft.status]} dot>{draft.status}</Pill>
          {draft.deliveryDate && (
            <span style={fx({ gap: 6, fontSize: 13, color: "var(--tx-2)" })}>
              <I.Calendar size={14} /> Entrega {fmtDateLong(draft.deliveryDate)}<DaysChip date={draft.deliveryDate} />
            </span>
          )}
          {draft.openingDate && (
            <span style={fx({ gap: 6, fontSize: 13, color: "var(--tx-2)" })}>
              <I.Calendar size={14} /> Apertura {fmtDateLong(draft.openingDate)}<DaysChip date={draft.openingDate} />
            </span>
          )}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
        <Card>
          <SecLabel>General</SecLabel>
          <div style={col({ gap: 12 })}>
            <div>
              <Lbl>Marca</Lbl>
              {isNew
                ? <Select value={draft.brand} onChange={e => upd("brand", e.target.value)}>{BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
                : <div style={{ height: 36, padding: "0 12px", background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center" }}><BrandChip id={draft.brand} /></div>}
            </div>
            <div style={fx({ gap: 10 })}>
              <div style={{ flex: 1 }}><Lbl>N° local</Lbl><Input value={draft.localNumber || ""} onChange={e => upd("localNumber", e.target.value)} placeholder="L-214" /></div>
              <div style={{ flex: 1 }}><Lbl>Área</Lbl><Input value={draft.localArea || ""} onChange={e => upd("localArea", e.target.value)} placeholder="62 m²" /></div>
            </div>
            <div>
              <Lbl>Estado</Lbl>
              <div style={fx({ gap: 6, flexWrap: "wrap" })}>
                {STATUS_LIST.map(s => {
                  const active = draft.status === s, c = tc(STATUS_TOKEN[s]);
                  return (
                    <button key={s} onClick={() => upd("status", s)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 500, background: active ? c.bg : "transparent", color: active ? c.fg : "var(--tx-2)", border: `1px solid ${active ? "transparent" : "var(--bd)"}`, borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.fg }} />}{s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <SecLabel>Cronograma</SecLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
            <div><Lbl>Inicio</Lbl><Input type="date" value={draft.startDate || ""} onChange={e => upd("startDate", e.target.value)} /></div>
            <div><Lbl>Entrega de obra</Lbl><Input type="date" value={draft.deliveryDate || ""} onChange={e => upd("deliveryDate", e.target.value)} /></div>
            <div><Lbl>Apertura</Lbl><Input type="date" value={draft.openingDate || ""} onChange={e => upd("openingDate", e.target.value)} /></div>
          </div>
          {draft.startDate && draft.openingDate && <TimelineMini start={draft.startDate} end={draft.openingDate} />}
        </Card>
      </div>
      <Card>
        <SecLabel action={<Btn size="sm" variant="soft" icon={<I.Plus size={13} />} onClick={() => setContactForm({ id: `c-${crypto.randomUUID()}`, name: "", phone: "", email: "", role: "" })}>Agregar</Btn>}>Contactos</SecLabel>
        {contactForm && (
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              <div><Lbl>Nombre *</Lbl><Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="Juan Pérez" /></div>
              <div><Lbl>Rol</Lbl><Input value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="Maestro de obra" /></div>
              <div><Lbl>Teléfono</Lbl><Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="+57 300 000 0000" /></div>
              <div><Lbl>Correo</Lbl><Input value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" /></div>
            </div>
            <div style={fx({ gap: 8, marginTop: 12 })}>
              <Btn variant="primary" size="sm" onClick={() => saveContact(contactForm)} disabled={!contactForm.name.trim()}>Guardar</Btn>
              <Btn variant="text" size="sm" onClick={() => setContactForm(null)}>Cancelar</Btn>
            </div>
          </div>
        )}
        {!(draft.contacts ?? []).length && !contactForm && <div style={{ padding: "16px 0", textAlign: "center", color: "var(--tx-3)", fontSize: 13 }}>Sin contactos</div>}
        <div style={col({ gap: 8 })}>
          {(draft.contacts ?? []).map(c => (
            <div key={c.id} style={fx({ gap: 12, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10 })}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-elev)", border: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0, color: "var(--tx-2)" }}>{c.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{c.name}</div>
                <div style={fx({ gap: 12, marginTop: 2, flexWrap: "wrap", fontSize: 11, color: "var(--tx-3)" })}>
                  {c.role  && <span>{c.role}</span>}
                  {c.phone && <a href={`tel:${c.phone}`}   style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><I.Phone size={11} />{c.phone}</a>}
                  {c.email && <a href={`mailto:${c.email}`} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><I.Mail  size={11} />{c.email}</a>}
                </div>
              </div>
              <IconBtn icon={<I.PenLine size={14} />} onClick={() => setContactForm({ ...c })} title="Editar" />
              <IconBtn icon={<I.X size={14} />} onClick={() => upd("contacts", prev => (prev ?? []).filter(x => x.id !== c.id))} title="Eliminar" />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SecLabel>Notas de la obra</SecLabel>
        <Textarea value={draft.notes || ""} onChange={e => upd("notes", e.target.value)} placeholder="Observaciones, instrucciones especiales, contexto…" style={{ minHeight: 120 }} />
      </Card>
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
