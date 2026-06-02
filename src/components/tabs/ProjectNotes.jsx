import { useState, useMemo, useEffect, useRef } from 'react';
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
import { compressImage, getPhotoSrc } from '../../lib/dataModel.js';
import { storage } from '../../lib/supabase.js';

const EMPTY_FORM = { text: "", rem: "", assignee: "", comment: "", photos: [] };

export default function ProjectNotes({ draft, upd, readOnly = false }) {
  const list = draft.checklist ?? [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formUploading, setFormUploading] = useState(false);
  const formFileRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const assignees = useMemo(() => [...new Set(list.map(x => x.assignee).filter(Boolean))].sort(), [list]);
  useEffect(() => { if (filter !== "all" && !assignees.includes(filter)) setFilter("all"); }, [assignees, filter]);
  const filtered = filter === "all" ? list : list.filter(x => x.assignee === filter);
  const pending = filtered.filter(x => !x.done);
  const done    = filtered.filter(x => x.done);
  const totalPending = list.filter(x => !x.done).length;
  const totalDone    = list.filter(x => x.done).length;
  const totalOverdue = list.filter(x => !x.done && x.reminder?.date && daysUntil(x.reminder.date) < 0).length;

  const uploadFormPhotos = async files => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setFormUploading(true);
    const newPhotos = [];
    try {
      for (const f of valid) {
        const photoId = `ph-${crypto.randomUUID()}`;
        console.log(`[notes-form] archivo: ${f.name} | tipo:${f.type} | tamaño:${(f.size/1024).toFixed(0)}KB`);
        const dataUrl = await compressImage(f);
        console.log(`[notes-form] comprimida: ${(dataUrl.length/1024).toFixed(0)}KB base64`);
        const url = await storage.upload(dataUrl, draft.id, photoId);
        newPhotos.push({ id: photoId, name: f.name, url, storagePath: `${draft.id}/${photoId}.jpg`, uploadedAt: Date.now() });
      }
      setForm(f => ({ ...f, photos: [...f.photos, ...newPhotos] }));
    } catch (e) {
      console.error("[notes-form] ❌ upload error:", e);
      if (newPhotos.length) storage.remove(newPhotos.map(p => p.storagePath)).catch(console.error);
    } finally {
      setFormUploading(false);
    }
  };

  const removeFormPhoto = id => {
    const ph = form.photos.find(p => p.id === id);
    setForm(f => ({ ...f, photos: f.photos.filter(p => p.id !== id) }));
    if (ph?.storagePath) storage.remove([ph.storagePath]).catch(console.error);
  };

  const removeItem = it => {
    const paths = (it.photos ?? []).map(p => p.storagePath).filter(Boolean);
    if (paths.length) storage.remove(paths).catch(console.error);
    upd("checklist", prev => prev.filter(x => x.id !== it.id));
  };

  const addItem = () => {
    if (!form.text.trim()) return;
    upd("checklist", prev => [...prev, { id: `cl-${crypto.randomUUID()}`, text: form.text.trim(), done: false, assignee: form.assignee.trim() || "", reminder: form.rem ? { date: form.rem } : null, photos: form.photos, comment: form.comment }]);
    setForm(EMPTY_FORM); setAdding(false);
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
              <div style={{ flex: "1 1 120px" }}><Lbl>Fecha</Lbl><Input type="date" value={form.rem} onChange={e => setForm(f => ({ ...f, rem: e.target.value }))} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <Lbl>Notas</Lbl>
              <textarea
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="Comentarios o notas adicionales…"
                rows={2}
                style={{ width: "100%", resize: "vertical", border: "1px solid var(--bd)", borderRadius: 8, background: "var(--bg-elev)", color: "var(--tx)", fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color .12s" }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={e  => { e.currentTarget.style.borderColor = "var(--bd)"; }}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <Lbl>Fotos</Lbl>
              <input ref={formFileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => { uploadFormPhotos(e.target.files); e.target.value = ""; }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                {form.photos.map(ph => (
                  <div key={ph.id} style={{ position: "relative", width: 88, height: 66, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid var(--bd)" }}>
                    <div style={{ width: "100%", height: "100%", backgroundImage: `url(${getPhotoSrc(ph)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <button onClick={() => removeFormPhoto(ph.id)} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <I.X size={9} />
                    </button>
                  </div>
                ))}
                <button onClick={() => formFileRef.current?.click()} disabled={formUploading} style={{ width: 88, height: 66, borderRadius: 8, border: "1.5px dashed var(--bd-strong)", background: "var(--bg-elev)", color: "var(--tx-3)", cursor: formUploading ? "wait" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, flexShrink: 0, opacity: formUploading ? 0.6 : 1 }}>
                  {formUploading ? <span style={{ fontSize: 13, fontWeight: 600 }}>…</span> : <><I.Camera size={15} /><span>Foto</span></>}
                </button>
              </div>
            </div>
            <div style={fx({ gap: 8, marginTop: 12 })}>
              <Btn variant="primary" size="sm" onClick={addItem} disabled={!form.text.trim() || formUploading}>Agregar</Btn>
              <Btn variant="text" size="sm" onClick={() => {
                const paths = form.photos.map(p => p.storagePath).filter(Boolean);
                if (paths.length) storage.remove(paths).catch(console.error);
                setAdding(false); setForm(EMPTY_FORM);
              }}>Cancelar</Btn>
            </div>
          </div>
        )}
        {filtered.length === 0 && !adding && <Empty icon={<I.Check size={20} />} title="Sin pendientes" hint="Agrega tareas para esta obra" />}
        {pending.length > 0 && <div style={col({ gap: 6 })}>{pending.map(it => <ChecklistRow key={it.id} item={it} suggestions={assignees} readOnly={readOnly} onPatch={ch => patch(it.id, ch)} onRemove={() => removeItem(it)} projectId={draft.id} />)}</div>}
        {done.length > 0 && <>
          <div style={{ marginTop: 14, marginBottom: 8, fontSize: 11, fontWeight: 600, color: "var(--tx-3)", letterSpacing: .4, textTransform: "uppercase" }}>Completadas · {done.length}</div>
          <div style={col({ gap: 6, opacity: .65 })}>{done.map(it => <ChecklistRow key={it.id} item={it} suggestions={assignees} readOnly={readOnly} onPatch={ch => patch(it.id, ch)} onRemove={() => removeItem(it)} projectId={draft.id} />)}</div>
        </>}
      </Card>
    </div>
  );
}

function ChecklistRow({ item, suggestions, onPatch, onRemove, readOnly = false, projectId }) {
  const [editRem,  setEditRem]  = useState(false);
  const [editAsgn, setEditAsgn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileInputRef = useRef(null);
  const due = item.reminder?.date ? daysUntil(item.reminder.date) : null;
  const remToken = (!item.done && due !== null && due < 0) ? "danger" : (!item.done && due !== null && due <= 3) ? "warn" : "info";
  const photos = item.photos ?? [];
  const comment = item.comment ?? "";
  const hasExtra = photos.length > 0 || comment.trim();

  const uploadPhotos = async files => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setUploading(true);
    const newPhotos = [];
    try {
      for (const f of valid) {
        const photoId = `ph-${crypto.randomUUID()}`;
        console.log(`[notes-row] archivo: ${f.name} | tipo:${f.type} | tamaño:${(f.size/1024).toFixed(0)}KB`);
        const dataUrl = await compressImage(f);
        console.log(`[notes-row] comprimida: ${(dataUrl.length/1024).toFixed(0)}KB base64`);
        const url = await storage.upload(dataUrl, projectId, photoId);
        newPhotos.push({ id: photoId, name: f.name, url, storagePath: `${projectId}/${photoId}.jpg`, uploadedAt: Date.now() });
      }
      onPatch({ photos: [...photos, ...newPhotos] });
    } catch (e) {
      console.error("[notes-row] ❌ upload error:", e);
      if (newPhotos.length) storage.remove(newPhotos.map(p => p.storagePath)).catch(console.error);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = id => {
    const photo = photos.find(p => p.id === id);
    setLightbox(lb => lb === null ? null : photos.length <= 1 ? null : Math.min(lb, photos.length - 2));
    onPatch({ photos: photos.filter(p => p.id !== id) });
    if (photo?.storagePath) storage.remove([photo.storagePath]).catch(console.error);
  };

  useEffect(() => {
    if (lightbox === null || photos.length === 0) return;
    const onKey = e => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); setLightbox(l => (l - 1 + photos.length) % photos.length); }
      if (e.key === "ArrowRight") { e.preventDefault(); setLightbox(l => (l + 1) % photos.length); }
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  const Lightbox = lightbox !== null && photos[lightbox] ? (
    <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "90vw", gap: 10 }}>
        <img src={getPhotoSrc(photos[lightbox])} alt={photos[lightbox].name} style={{ maxWidth: "82vw", maxHeight: "72vh", objectFit: "contain", borderRadius: 8, display: "block" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: .5 }}>{lightbox + 1} / {photos.length}</div>
      </div>
      {photos.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setLightbox(l => (l - 1 + photos.length) % photos.length); }} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.ArrowL size={20} /></button>
        <button onClick={e => { e.stopPropagation(); setLightbox(l => (l + 1) % photos.length); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.ArrowR size={20} /></button>
      </>}
      <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.X size={16} /></button>
    </div>
  ) : null;

  if (readOnly) return (
    <>
      <div style={col({ background: "var(--bg-soft)", borderRadius: 10, overflow: "hidden" })}>
        <div style={fx({ gap: 10, padding: "10px 12px", flexWrap: "wrap" })}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${item.done ? "var(--ok)" : "var(--bd-strong)"}`, background: item.done ? "var(--ok)" : "transparent", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.done && <I.Check size={11} sw={3} />}</div>
          <div style={{ flex: 1, fontSize: 13, color: "var(--tx)", textDecoration: item.done ? "line-through" : "none" }}>{item.text}</div>
          {item.assignee && <span style={fx({ gap: 5, fontSize: 11, color: "var(--tx-3)" })}><Avatar name={item.assignee} size={18} />{item.assignee}</span>}
          {item.reminder?.date && <Pill token={due !== null && due < 0 && !item.done ? "danger" : "info"} size="sm">{fmtDate(item.reminder.date)}</Pill>}
        </div>
        {hasExtra && (
          <div style={{ borderTop: "1px solid var(--bd)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {comment.trim() && <div style={{ fontSize: 13, color: "var(--tx-2)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{comment}</div>}
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 8 }}>
                {photos.map((ph, idx) => (
                  <div key={ph.id} onClick={() => setLightbox(idx)} style={{ aspectRatio: "4/3", backgroundImage: `url(${getPhotoSrc(ph)})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 8, cursor: "zoom-in" }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {Lightbox}
    </>
  );

  return (
    <>
      <div style={col({ background: "var(--bg-soft)", borderRadius: 10, overflow: "hidden" })}>
        <div style={fx({ gap: 8, padding: "10px 12px", flexWrap: "wrap" })}>
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
        <div style={{ borderTop: "1px solid var(--bd)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={comment}
            onChange={e => onPatch({ comment: e.target.value })}
            placeholder="Notas o comentarios…"
            rows={2}
            style={{ width: "100%", resize: "vertical", border: "1px solid var(--bd)", borderRadius: 8, background: "var(--bg-elev)", color: "var(--tx)", fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color .12s" }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "var(--bd)"; }}
          />
          <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => { uploadPhotos(e.target.files); e.target.value = ""; }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            {photos.map((ph, idx) => (
              <div key={ph.id} style={{ position: "relative", width: 88, height: 66, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid var(--bd)" }}>
                <div onClick={() => setLightbox(idx)} style={{ width: "100%", height: "100%", backgroundImage: `url(${getPhotoSrc(ph)})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "zoom-in" }} />
                <button onClick={() => removePhoto(ph.id)} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <I.X size={9} />
                </button>
              </div>
            ))}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: 88, height: 66, borderRadius: 8, border: "1.5px dashed var(--bd-strong)", background: "var(--bg-elev)", color: "var(--tx-3)", cursor: uploading ? "wait" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11, flexShrink: 0, opacity: uploading ? 0.6 : 1 }}>
              {uploading ? <span style={{ fontSize: 13, fontWeight: 600 }}>…</span> : <><I.Camera size={15} /><span>Foto</span></>}
            </button>
          </div>
        </div>
      </div>
      {Lightbox}
    </>
  );
}
