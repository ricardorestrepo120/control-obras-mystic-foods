import { useState, useEffect, useCallback } from 'react';
import Empty from '../ui/Empty.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, relTime } from '../../lib/utils.js';
import { MAX_PHOTO_SIDE, PHOTO_QUALITY } from '../../lib/dataModel.js';

// build: 2026-05-06
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > MAX_PHOTO_SIDE || h > MAX_PHOTO_SIDE) { const r = Math.min(MAX_PHOTO_SIDE / w, MAX_PHOTO_SIDE / h); w = Math.round(w * r); h = Math.round(h * r); }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", PHOTO_QUALITY));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ProjectPhotos({ draft, setDraft, onSaveNow }) {
  const photos = draft.photos ?? [];
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sizeWarn, setSizeWarn] = useState("");

  const newPhotoId = useCallback(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return `ph-${crypto.randomUUID()}`;
    return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }, []);

  const upload = async files => {
    console.log("[photos] upload llamado, files:", files?.length, files);
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    console.log("[photos] archivos válidos:", valid.length, valid.map(f => `${f.name} (${f.type}, ${f.size}b)`));
    if (!valid.length) { console.log("[photos] sin archivos válidos, abortando"); return; }
    setUploading(true); setSizeWarn("");
    try {
      const newPhotos = await Promise.all(valid.map(async f => {
        console.log("[photos] comprimiendo:", f.name);
        const data = await compressImage(f);
        console.log("[photos] compresión ok:", f.name, "dataUrl length:", data?.length);
        return { id: newPhotoId(), name: f.name, data, uploadedAt: Date.now(), caption: "" };
      }));
      console.log("[photos] todas comprimidas, guardando en draft:", newPhotos.length);
      setDraft(d => {
        const updated = { ...d, photos: [...(d.photos ?? []), ...newPhotos] };
        console.log("[photos] draft actualizado, total fotos:", updated.photos.length);
        setTimeout(() => { console.log("[photos] llamando onSaveNow"); onSaveNow(); }, 0);
        return updated;
      });
    } catch (e) {
      console.error("[photos] upload error:", e);
      setSizeWarn("Error al procesar las fotos. Intenta de nuevo.");
      setTimeout(() => setSizeWarn(""), 4000);
    } finally {
      setUploading(false);
    }
  };

  const remove = id => {
    setDraft(d => {
      const nextPhotos = (d.photos ?? []).filter(p => p.id !== id);
      setLightbox(lb => lb === null ? null : nextPhotos.length === 0 ? null : Math.min(lb, nextPhotos.length - 1));
      setTimeout(() => onSaveNow(), 0);
      return { ...d, photos: nextPhotos };
    });
  };

  const setCaption = (id, caption) => setDraft(d => ({ ...d, photos: (d.photos ?? []).map(p => p.id === id ? { ...p, caption } : p) }));
  const prev = () => setLightbox(l => (l - 1 + photos.length) % photos.length);
  const next = () => setLightbox(l => (l + 1) % photos.length);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = e => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  return (
    <div className="fu" style={col({ gap: 14 })}>
      <label
        htmlFor="photo-upload-input"
        onClick={e => { console.log("[photos] click label, uploading:", uploading); if (uploading) e.preventDefault(); }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
        onDragLeave={e => e.currentTarget.style.borderColor = "var(--bd-strong)"}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--bd-strong)"; console.log("[photos] onDrop, files:", e.dataTransfer.files?.length); upload(e.dataTransfer.files); }}
        style={{ display: "block", padding: "28px 20px", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: "var(--bg-elev)", border: "1.5px dashed var(--bd-strong)", borderRadius: 12, transition: "border-color .15s", opacity: uploading ? .7 : 1 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-soft)", color: "var(--tx-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          {uploading ? <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-3)" }}>…</span> : <I.Camera size={18} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)", marginBottom: 2 }}>{uploading ? "Procesando fotos…" : "Subir fotos"}</div>
        <div style={{ fontSize: 12, color: "var(--tx-3)" }}>{uploading ? "Un momento…" : "Arrastra imágenes o haz clic · JPG, PNG, WEBP"}</div>
        <input id="photo-upload-input" type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => { console.log("[photos] onChange disparado, files:", e.target.files?.length); upload(e.target.files); e.target.value = ""; }} />
      </label>
      {sizeWarn && <div style={{ background: "var(--warn-bg)", color: "var(--warn)", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 500 }}>⚠ {sizeWarn}</div>}
      {photos.length === 0
        ? <Empty icon={<I.Camera size={20} />} title="Sin fotos" hint="Sube fotos de avance de la obra" />
        : <>
            <div style={{ fontSize: 12, color: "var(--tx-3)", fontWeight: 500 }}>{photos.length} foto{photos.length !== 1 ? "s" : ""}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
              {photos.map((ph, idx) => (
                <div key={ph.id} style={{ borderRadius: 10, overflow: "hidden", background: "var(--bg-elev)", border: "1px solid var(--bd)", transition: "all .15s ease" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--bd-strong)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bd)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div onClick={() => setLightbox(idx)} style={{ aspectRatio: "4/3", backgroundImage: `url(${ph.data})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "zoom-in" }} />
                  <div style={{ padding: "8px 10px" }}>
                    <input value={ph.caption || ""} onChange={e => setCaption(ph.id, e.target.value)} placeholder="Descripción…" style={{ width: "100%", border: "none", background: "transparent", fontSize: 12, color: "var(--tx-2)", outline: "none", marginBottom: 4 }} />
                    <div style={fx({ justifyContent: "space-between", fontSize: 10, color: "var(--tx-4)" })}>
                      <span>{relTime(ph.uploadedAt)}</span>
                      <IconBtn size={22} icon={<I.Trash size={11} />} onClick={() => remove(ph.id)} title="Eliminar" danger />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>}
      {lightbox !== null && photos[lightbox] && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={col({ alignItems: "center", maxWidth: "90vw", gap: 10 })}>
            <img src={photos[lightbox].data} alt={photos[lightbox].caption || photos[lightbox].name} style={{ maxWidth: "82vw", maxHeight: "72vh", objectFit: "contain", borderRadius: 8, display: "block" }} />
            {photos[lightbox].caption && <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", maxWidth: 500, textAlign: "center", lineHeight: 1.5 }}>{photos[lightbox].caption}</div>}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: .5 }}>{lightbox + 1} / {photos.length}</div>
          </div>
          {photos.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); prev(); }} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.ArrowL size={20} /></button>
            <button onClick={e => { e.stopPropagation(); next(); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.ArrowR size={20} /></button>
          </>}
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.X size={16} /></button>
          <button onClick={e => { e.stopPropagation(); remove(photos[lightbox].id); }} style={{ position: "absolute", top: 14, left: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(180,30,30,.4)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Trash size={15} /></button>
        </div>
      )}
    </div>
  );
}
