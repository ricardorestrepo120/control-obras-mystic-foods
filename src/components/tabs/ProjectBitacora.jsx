import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../ui/Card.jsx';
import SecLabel from '../ui/SecLabel.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Lbl from '../ui/Lbl.jsx';
import Empty from '../ui/Empty.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, fmtDateLong } from '../../lib/utils.js';
import { compressImage, getPhotoSrc } from '../../lib/dataModel.js';
import { storage } from '../../lib/supabase.js';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const freshForm = () => ({ date: todayStr(), time: nowTimeStr(), quien: "", observaciones: "" });

export default function ProjectBitacora({ draft, setDraft, readOnly = false }) {
  const visitas = draft.visitas ?? [];
  const sorted = useMemo(() => [...visitas].sort((a, b) => {
    const ka = `${a.date}T${a.time || "00:00"}`;
    const kb = `${b.date}T${b.time || "00:00"}`;
    const cmp = kb.localeCompare(ka);
    return cmp !== 0 ? cmp : (b.createdAt ?? 0) - (a.createdAt ?? 0);
  }), [visitas]);

  const [adding, setAdding]         = useState(false);
  const [form, setForm]             = useState(freshForm);
  const [formPhotos, setFormPhotos] = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [uploadErr, setUploadErr]   = useState("");

  const genRef           = useRef(0);
  const uploadErrTimerRef = useRef(null);

  useEffect(() => () => { clearTimeout(uploadErrTimerRef.current); }, []);

  const uploadPhotos = async files => {
    const gen = ++genRef.current;
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setUploading(true);
    clearTimeout(uploadErrTimerRef.current);
    setUploadErr("");
    // Sequential upload: check gen inside loop so a cancel mid-upload
    // immediately cleans up already-uploaded Storage objects.
    const added = [];
    try {
      for (const f of valid) {
        if (gen !== genRef.current) {
          if (added.length) storage.remove(added.map(p => p.storagePath)).catch(console.error);
          return;
        }
        const photoId = `vph-${crypto.randomUUID()}`;
        console.log(`[bitacora] archivo: ${f.name} | tipo:${f.type} | tamaño:${(f.size/1024).toFixed(0)}KB`);
        const dataUrl = await compressImage(f);
        console.log(`[bitacora] comprimida: ${(dataUrl.length/1024).toFixed(0)}KB base64`);
        const url = await storage.upload(dataUrl, draft.id, photoId);
        added.push({ id: photoId, name: f.name, url, storagePath: `${draft.id}/${photoId}.jpg`, uploadedAt: Date.now() });
      }
      if (gen !== genRef.current) {
        if (added.length) storage.remove(added.map(p => p.storagePath)).catch(console.error);
        return;
      }
      setFormPhotos(prev => [...prev, ...added]);
    } catch (err) {
      if (gen !== genRef.current) return;
      console.error("[bitacora] ❌ upload error:", err);
      if (added.length) storage.remove(added.map(p => p.storagePath)).catch(console.error);
      setUploadErr(`Error al subir foto: ${err.message}`);
      uploadErrTimerRef.current = setTimeout(() => setUploadErr(""), 3000);
    } finally {
      if (gen === genRef.current) setUploading(false);
    }
  };

  const saveVisita = () => {
    if (!form.date || uploading) return;
    clearTimeout(uploadErrTimerRef.current);
    setUploadErr("");
    const v = {
      id: `v-${crypto.randomUUID()}`,
      date: form.date,
      time: form.time,
      quien: form.quien.trim(),
      observaciones: form.observaciones.trim(),
      photos: formPhotos,
      createdAt: Date.now(),
    };
    setDraft(d => ({ ...d, visitas: [...(d.visitas ?? []), v] }));
    setForm(freshForm());
    setFormPhotos([]);
    setAdding(false);
  };

  const cancel = () => {
    genRef.current++;
    // Cleanup any photos already uploaded to Storage for this discarded form
    const paths = formPhotos.map(p => p.storagePath).filter(Boolean);
    if (paths.length) storage.remove(paths).catch(console.error);
    setAdding(false);
    setForm(freshForm());
    setFormPhotos([]);
    clearTimeout(uploadErrTimerRef.current);
    setUploadErr("");
  };

  const removeFormPhoto = id => {
    const ph = formPhotos.find(p => p.id === id);
    setFormPhotos(prev => prev.filter(p => p.id !== id));
    if (ph?.storagePath) storage.remove([ph.storagePath]).catch(console.error);
  };

  const removeVisita = id => {
    const visita = visitas.find(v => v.id === id);
    setDraft(d => ({ ...d, visitas: (d.visitas ?? []).filter(v => v.id !== id) }));
    const paths = (visita?.photos ?? []).map(p => p.storagePath).filter(Boolean);
    if (paths.length) storage.remove(paths).catch(console.error);
  };

  return (
    <div className="fu" style={col({ gap: 14 })}>
      {!readOnly && !adding && (
        <div style={fx({ justifyContent: "flex-end" })}>
          <Btn variant="primary" size="sm" icon={<I.Plus size={13} />}
            onClick={() => { setForm(freshForm()); setAdding(true); }}>
            Nueva visita
          </Btn>
        </div>
      )}

      {adding && (
        <Card style={{ padding: 18 }}>
          <SecLabel>Registrar visita</SecLabel>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><Lbl>Fecha *</Lbl><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Lbl>Hora</Lbl><Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Lbl>¿Quién fue?</Lbl>
            <Input value={form.quien} onChange={e => setForm(f => ({ ...f, quien: e.target.value }))} placeholder="ej: Ricardo, Ana García" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <Lbl>Observaciones</Lbl>
            <Textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              placeholder="Estado de la obra, avances observados, pendientes…" style={{ minHeight: 100 }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Lbl>Fotos de la visita</Lbl>
            <label
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "var(--bd-strong)"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--bd-strong)"; uploadPhotos(e.dataTransfer.files); }}
              onClick={e => { if (uploading) e.preventDefault(); }}
              style={{ display: "block", padding: "14px 16px", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: "var(--bg-soft)", border: "1.5px dashed var(--bd-strong)", borderRadius: 10, opacity: uploading ? .7 : 1, transition: "border-color .15s" }}>
              <div style={{ fontSize: 12, color: "var(--tx-3)" }}>
                {uploading ? "Procesando fotos…" : "Arrastra imágenes o haz clic · JPG, PNG, WEBP"}
              </div>
              <input type="file" multiple accept="image/*" style={{ display: "none" }}
                onChange={e => { uploadPhotos(e.target.files); e.target.value = ""; }} />
            </label>
            {uploadErr && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>⚠ {uploadErr}</div>}
            {formPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6, marginTop: 10 }}>
                {formPhotos.map(ph => (
                  <div key={ph.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ aspectRatio: "1", backgroundImage: `url(${getPhotoSrc(ph)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <button onClick={() => removeFormPhoto(ph.id)}
                      style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <I.X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={fx({ gap: 8 })}>
            <Btn variant="primary" size="sm" onClick={saveVisita} disabled={!form.date || uploading}>Guardar visita</Btn>
            <Btn variant="text" size="sm" onClick={cancel}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {sorted.length === 0 && !adding && (
        <Empty icon={<I.Notebook size={20} />} title="Sin visitas registradas"
          hint="Registra las visitas a la obra con tus observaciones y fotos" />
      )}

      {sorted.map(v => (
        <VisitaCard key={v.id} visita={v} readOnly={readOnly} onRemove={() => removeVisita(v.id)} />
      ))}
    </div>
  );
}

function VisitaCard({ visita, readOnly, onRemove }) {
  const photos = visita.photos ?? [];
  const [lightbox, setLightbox] = useState(null);
  const hasBody = visita.observaciones || photos.length > 0;

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = e => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); setLightbox(l => (l - 1 + photos.length) % photos.length); }
      if (e.key === "ArrowRight") { e.preventDefault(); setLightbox(l => (l + 1) % photos.length); }
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={fx({ gap: 12, padding: "14px 16px", borderBottom: hasBody ? "1px solid var(--bd)" : "none", justifyContent: "space-between" })}>
        <div style={fx({ gap: 10, flex: 1, minWidth: 0 })}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--info-bg)", color: "var(--info)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I.Calendar size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)", lineHeight: 1.3 }}>
              {fmtDateLong(visita.date)}{visita.time ? ` · ${visita.time}` : ""}
            </div>
            {visita.quien && (
              <div style={fx({ gap: 5, marginTop: 3, fontSize: 12, color: "var(--tx-3)" })}>
                <I.User size={11} />{visita.quien}
              </div>
            )}
          </div>
        </div>
        <div style={fx({ gap: 8, flexShrink: 0 })}>
          {photos.length > 0 && (
            <span style={fx({ gap: 4, fontSize: 11, color: "var(--tx-4)", background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 999, padding: "2px 8px" })}>
              <I.Camera size={10} />{photos.length}
            </span>
          )}
          {!readOnly && <IconBtn icon={<I.Trash size={13} />} onClick={onRemove} title="Eliminar visita" danger />}
        </div>
      </div>

      {/* Body */}
      {hasBody && (
        <div style={{ padding: "14px 16px" }}>
          {visita.observaciones && (
            <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.65, whiteSpace: "pre-wrap", marginBottom: photos.length > 0 ? 14 : 0 }}>
              {visita.observaciones}
            </div>
          )}
          {photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
              {photos.map((ph, idx) => (
                <div key={ph.id} onClick={() => setLightbox(idx)}
                  style={{ aspectRatio: "4/3", backgroundImage: `url(${getPhotoSrc(ph)})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 8, cursor: "zoom-in", border: "1px solid var(--bd)", transition: "opacity .15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={col({ alignItems: "center", maxWidth: "90vw", gap: 10 })}>
            <img src={getPhotoSrc(photos[lightbox])} alt={photos[lightbox].name || ""}
              style={{ maxWidth: "82vw", maxHeight: "72vh", objectFit: "contain", borderRadius: 8, display: "block" }} />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: .5 }}>{lightbox + 1} / {photos.length}</div>
          </div>
          {photos.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setLightbox(l => (l - 1 + photos.length) % photos.length); }}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I.ArrowL size={20} />
            </button>
            <button onClick={e => { e.stopPropagation(); setLightbox(l => (l + 1) % photos.length); }}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I.ArrowR size={20} />
            </button>
          </>}
          <button onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I.X size={16} />
          </button>
        </div>
      )}
    </Card>
  );
}
