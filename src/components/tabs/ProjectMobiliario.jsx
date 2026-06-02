import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../ui/Card.jsx';
import SecLabel from '../ui/SecLabel.jsx';
import Pill from '../ui/Pill.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Input from '../ui/Input.jsx';
import Lbl from '../ui/Lbl.jsx';
import Empty from '../ui/Empty.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, tc } from '../../lib/utils.js';
import { compressImage, getPhotoSrc } from '../../lib/dataModel.js';
import { storage } from '../../lib/supabase.js';

const freshForm = () => ({ nombre: "", cantidad: 1, proveedor: "", foto: null, estado: "Pendiente" });

export default function ProjectMobiliario({ draft, upd, readOnly = false }) {
  const items = draft.mobiliario ?? [];

  const sorted = useMemo(() => [...items].sort((a, b) =>
    a.estado === b.estado ? 0 : a.estado === "Pendiente" ? -1 : 1
  ), [items]);

  const listos = items.filter(x => x.estado === "Listo").length;
  const pct    = items.length ? Math.round(listos / items.length * 100) : 0;

  const [adding,    setAdding]    = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(freshForm);
  const [uploading, setUploading] = useState(false);

  // Tracks the storagePath of a photo uploaded in the current open form that
  // has NOT yet been committed — needs Storage cleanup on cancel/replacement.
  const pendingFotoPathRef = useRef(null);

  const patch = (id, ch) => upd("mobiliario", prev => prev.map(x => x.id === id ? { ...x, ...ch } : x));

  const handlePhoto = async files => {
    const file = Array.from(files).find(f => f.type.startsWith("image/"));
    if (!file) return;
    setUploading(true);
    try {
      // If a previous (uncommitted) foto was already uploaded, discard it
      if (pendingFotoPathRef.current) {
        storage.remove([pendingFotoPathRef.current]).catch(console.error);
        pendingFotoPathRef.current = null;
      }
      const photoId = `mf-${crypto.randomUUID()}`;
      console.log(`[mobiliario] foto: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(0)}KB)`);
      const dataUrl = await compressImage(file);
      const url     = await storage.upload(dataUrl, draft.id, photoId);
      const storagePath = `${draft.id}/${photoId}.jpg`;
      pendingFotoPathRef.current = storagePath;
      setForm(f => ({ ...f, foto: { id: photoId, name: file.name, url, storagePath } }));
    } catch (err) {
      console.error("[mobiliario] ❌ foto upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  // Removes the currently previewed foto from the form AND cleans it up from
  // Storage if it was a newly uploaded (pending) one.
  const handleRemoveFoto = () => {
    if (pendingFotoPathRef.current) {
      storage.remove([pendingFotoPathRef.current]).catch(console.error);
      pendingFotoPathRef.current = null;
    }
    setForm(f => ({ ...f, foto: null }));
  };

  const cancelForm = () => {
    // Clean up any foto that was uploaded but never persisted
    if (pendingFotoPathRef.current) {
      storage.remove([pendingFotoPathRef.current]).catch(console.error);
      pendingFotoPathRef.current = null;
    }
    setAdding(false); setEditId(null); setForm(freshForm());
  };

  const commitAdd = () => {
    if (!form.nombre.trim()) return;
    pendingFotoPathRef.current = null; // foto is now persisted — no cleanup needed
    upd("mobiliario", prev => [...prev, {
      id: `mob-${crypto.randomUUID()}`,
      nombre:    form.nombre.trim(),
      cantidad:  Math.max(1, Number(form.cantidad) || 1),
      proveedor: form.proveedor.trim(),
      foto:      form.foto,
      estado:    form.estado,
    }]);
    setForm(freshForm()); setAdding(false);
  };

  const commitEdit = () => {
    if (!form.nombre.trim()) return;
    // If the foto was replaced, remove the old one from Storage
    const original = items.find(x => x.id === editId);
    if (original?.foto?.storagePath && original.foto.id !== form.foto?.id) {
      storage.remove([original.foto.storagePath]).catch(console.error);
    }
    pendingFotoPathRef.current = null; // new foto is now persisted
    patch(editId, {
      nombre:    form.nombre.trim(),
      cantidad:  Math.max(1, Number(form.cantidad) || 1),
      proveedor: form.proveedor.trim(),
      foto:      form.foto,
      estado:    form.estado,
    });
    setEditId(null); setForm(freshForm());
  };

  const openEdit = item => {
    // cancelForm cleans up any pending foto from an abandoned previous session
    cancelForm();
    setForm({ nombre: item.nombre, cantidad: item.cantidad, proveedor: item.proveedor || "", foto: item.foto ?? null, estado: item.estado });
    setEditId(item.id);
  };

  return (
    <div className="fu" style={col({ gap: 14 })}>

      {/* Resumen */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 10 }}>
          {[
            { label: "Total",      value: items.length },
            { label: "Listos",     value: listos,              token: listos > 0 ? "ok" : null },
            { label: "Pendientes", value: items.length - listos },
          ].map(s => {
            const c = s.token ? tc(s.token) : null;
            return (
              <div key={s.label} style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "10px 14px", borderLeft: c ? `3px solid ${c.fg}` : "3px solid var(--bd)" }}>
                <div style={{ fontSize: 11, color: "var(--tx-3)", fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: c ? c.fg : "var(--tx)", letterSpacing: -.5, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              </div>
            );
          })}
        </div>
        {items.length > 0 && <ProgressBar value={pct} height={6} style={{ marginTop: 12 }} />}
      </Card>

      {/* Lista */}
      <Card>
        <SecLabel action={!readOnly && !adding && !editId && (
          <Btn size="sm" variant="soft" icon={<I.Plus size={13} />} onClick={() => { cancelForm(); setAdding(true); }}>
            Agregar item
          </Btn>
        )}>
          Inventario de mobiliario
        </SecLabel>

        {adding && (
          <ItemForm form={form} setForm={setForm} uploading={uploading}
            onPhoto={handlePhoto} onRemoveFoto={handleRemoveFoto}
            onSave={commitAdd} onCancel={cancelForm} saveLabel="Agregar" />
        )}

        {sorted.length === 0 && !adding && (
          <Empty icon={<I.Package size={20} />} title="Sin mobiliario registrado"
            hint="Agrega los items de mobiliario para esta obra" />
        )}

        <div style={col({ gap: 6 })}>
          {sorted.map(item => (
            editId === item.id ? (
              <ItemForm key={item.id} form={form} setForm={setForm} uploading={uploading}
                onPhoto={handlePhoto} onRemoveFoto={handleRemoveFoto}
                onSave={commitEdit} onCancel={cancelForm} saveLabel="Guardar" />
            ) : (
              <ItemRow key={item.id} item={item} readOnly={readOnly}
                onEdit={() => openEdit(item)}
                onRemove={() => {
                  if (item.foto?.storagePath) storage.remove([item.foto.storagePath]).catch(console.error);
                  upd("mobiliario", prev => prev.filter(x => x.id !== item.id));
                }}
                onToggle={() => patch(item.id, { estado: item.estado === "Listo" ? "Pendiente" : "Listo" })}
              />
            )
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── ItemForm ──────────────────────────────────────────────────────────────
function ItemForm({ form, setForm, uploading, onPhoto, onRemoveFoto, onSave, onCancel, saveLabel }) {
  return (
    <div style={{ background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 10, marginBottom: 10 }}>
        <div>
          <Lbl>Nombre / tipo *</Lbl>
          <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="ej: Silla de espera, Mesa de recepción…" autoFocus
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) onSave(); }} />
        </div>
        <div>
          <Lbl>Cantidad</Lbl>
          <Input type="number" min={1} value={form.cantidad}
            onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
            style={{ textAlign: "center" }} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <Lbl>Proveedor</Lbl>
        <Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))}
          placeholder="ej: Línea MX, Ikea…" />
      </div>

      <div style={{ marginBottom: 10 }}>
        <Lbl>Estado</Lbl>
        <div style={fx({ gap: 6 })}>
          {["Pendiente", "Listo"].map(s => {
            const active = form.estado === s;
            const isListo = s === "Listo";
            return (
              <button key={s} onClick={() => setForm(f => ({ ...f, estado: s }))}
                style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  border: `1.5px solid ${active ? (isListo ? "var(--ok)" : "var(--bd-strong)") : "var(--bd)"}`,
                  background: active ? (isListo ? "var(--ok-bg)" : "var(--bg-elev)") : "transparent",
                  color: active ? (isListo ? "var(--ok)" : "var(--tx)") : "var(--tx-3)" }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Lbl>Foto</Lbl>
        {form.foto ? (
          <div style={fx({ gap: 10, alignItems: "center" })}>
            <div style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid var(--bd)" }}>
              <img src={getPhotoSrc(form.foto)} alt={form.foto.name || "foto"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <Btn size="sm" variant="ghost" icon={<I.Trash size={13} />} onClick={onRemoveFoto}>
              Quitar foto
            </Btn>
          </div>
        ) : (
          <label
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = "var(--bd-strong)"; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--bd-strong)"; onPhoto(e.dataTransfer.files); }}
            style={{ display: "block", padding: "10px 14px", textAlign: "center", cursor: uploading ? "wait" : "pointer",
              background: "var(--bg-elev)", border: "1.5px dashed var(--bd-strong)", borderRadius: 10,
              fontSize: 12, color: "var(--tx-3)", opacity: uploading ? .7 : 1, transition: "border-color .15s" }}>
            {uploading ? "Subiendo foto…" : "Haz clic o arrastra una imagen · JPG, PNG, WEBP"}
            <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
              onChange={e => { onPhoto(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>

      <div style={fx({ gap: 8 })}>
        <Btn variant="primary" size="sm" onClick={onSave} disabled={!form.nombre.trim() || uploading}>{saveLabel}</Btn>
        <Btn variant="text" size="sm" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  );
}

// ── ItemRow ───────────────────────────────────────────────────────────────
function ItemRow({ item, readOnly, onEdit, onRemove, onToggle }) {
  const [lightbox, setLightbox] = useState(false);
  const isListo = item.estado === "Listo";

  useEffect(() => {
    if (!lightbox) return;
    const onKey = e => { if (e.key === "Escape") setLightbox(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <>
      <div style={fx({ gap: 10, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 10, flexWrap: "wrap" })}>

        {/* Thumbnail */}
        {item.foto ? (
          <div onClick={() => setLightbox(true)}
            style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, cursor: "zoom-in", border: "1px solid var(--bd)" }}>
            <img src={getPhotoSrc(item.foto)} alt={item.foto.name || "foto"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--bg-elev)", border: "1px solid var(--bd)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--tx-4)" }}>
            <I.Camera size={18} />
          </div>
        )}

        {/* Info */}
        <div style={{ flex: "1 1 120px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", marginBottom: 2,
            textDecoration: isListo ? "line-through" : "none", opacity: isListo ? .65 : 1 }}>
            {item.nombre}
          </div>
          {item.proveedor && (
            <div style={{ fontSize: 11, color: "var(--tx-3)" }}>{item.proveedor}</div>
          )}
        </div>

        {/* Controls */}
        <div style={fx({ gap: 6, flexShrink: 0, flexWrap: "wrap", alignItems: "center" })}>
          <span style={{ fontSize: 12, color: "var(--tx-2)", background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 6, padding: "2px 8px", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
            ×{item.cantidad}
          </span>
          {readOnly ? (
            <Pill token={isListo ? "ok" : null} dot>{item.estado}</Pill>
          ) : (
            <button onClick={onToggle}
              style={{ padding: "3px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999,
                background: isListo ? "var(--ok-bg)" : "var(--bg-elev)",
                color:      isListo ? "var(--ok)"    : "var(--tx-3)",
                border: `1px solid ${isListo ? "transparent" : "var(--bd)"}` }}>
              {isListo && <I.Check size={10} sw={2.5} />}{item.estado}
            </button>
          )}
          {!readOnly && (
            <>
              <IconBtn icon={<I.PenLine size={13} />} onClick={onEdit} title="Editar" />
              <IconBtn icon={<I.Trash size={13} />} onClick={onRemove} title="Eliminar" danger />
            </>
          )}
        </div>
      </div>

      {/* Lightbox — single photo, Escape to close */}
      {lightbox && item.foto && (
        <div onClick={() => setLightbox(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={getPhotoSrc(item.foto)} alt={item.foto.name || ""}
            style={{ maxWidth: "82vw", maxHeight: "82vh", objectFit: "contain", borderRadius: 8, display: "block" }} />
          <button onClick={() => setLightbox(false)}
            style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
