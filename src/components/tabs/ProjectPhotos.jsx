import { useState, useEffect, useRef } from 'react';
import Empty from '../ui/Empty.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, relTime } from '../../lib/utils.js';
import { compressImage, getPhotoSrc } from '../../lib/dataModel.js';
import { storage } from '../../lib/supabase.js';

export default function ProjectPhotos({ draft, setDraft }) {
  const photos = draft.photos ?? [];
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sizeWarn, setSizeWarn] = useState("");
  const sizeWarnTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(sizeWarnTimerRef.current), []);

  const upload = async files => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setUploading(true); setSizeWarn("");
    try {
      const newPhotos = await Promise.all(valid.map(async f => {
        const photoId = `ph-${crypto.randomUUID()}`;
        console.log(`[photos] archivo: ${f.name} | tipo:${f.type} | tamaño:${(f.size/1024).toFixed(0)}KB`);
        const dataUrl = await compressImage(f);
        console.log(`[photos] comprimida: ${(dataUrl.length/1024).toFixed(0)}KB base64`);
        const url = await storage.upload(dataUrl, draft.id, photoId);
        return { id: photoId, name: f.name, url, storagePath: `${draft.id}/${photoId}.jpg`, uploadedAt: Date.now(), caption: "" };
      }));
      setDraft(d => ({ ...d, photos: [...(d.photos ?? []), ...newPhotos] }));
    } catch (e) {
      console.error("[photos] ❌ upload error:", e);
      setSizeWarn(`Error al subir foto: ${e.message}`);
      clearTimeout(sizeWarnTimerRef.current);
      sizeWarnTimerRef.current = setTimeout(() => setSizeWarn(""), 4000);
    } finally {
      setUploading(false);
    }
  };

  const remove = id => {
    const photo     = photos.find(p => p.id === id);
    const nextPhotos = photos.filter(p => p.id !== id);
    setLightbox(lb => lb === null ? null : nextPhotos.length === 0 ? null : Math.min(lb, nextPhotos.length - 1));
    setDraft(d => ({ ...d, photos: (d.photos ?? []).filter(p => p.id !== id) }));
    if (photo?.storagePath) storage.remove([photo.storagePath]).catch(console.error);
  };

  const setCaption = (id, caption) => setDraft(d => ({ ...d, photos: (d.photos ?? []).map(p => p.id === id ? { ...p, caption } : p) }));

  useEffect(() => {
    if (lightbox === null) return;
    const len = photos.length;
    const onKey = e => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); setLightbox(l => (l - 1 + len) % len); }
      if (e.key === "ArrowRight") { e.preventDefault(); setLightbox(l => (l + 1) % len); }
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  return (
    <div className="fu" style={col({ gap: 14 })}>
      <label
        htmlFor="photo-upload-input"
        onClick={e => { if (uploading) e.preventDefault(); }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
        onDragLeave={e => e.currentTarget.style.borderColor = "var(--bd-strong)"}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--bd-strong)"; upload(e.dataTransfer.files); }}
        style={{ display: "block", padding: "28px 20px", textAlign: "center", cursor: uploading ? "wait" : "pointer", background: "var(--bg-elev)", border: "1.5px dashed var(--bd-strong)", borderRadius: 12, transition: "border-color .15s", opacity: uploading ? .7 : 1 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-soft)", color: "var(--tx-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          {uploading ? <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-3)" }}>…</span> : <I.Camera size={18} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)", marginBottom: 2 }}>{uploading ? "Procesando fotos…" : "Subir fotos"}</div>
        <div style={{ fontSize: 12, color: "var(--tx-3)" }}>{uploading ? "Un momento…" : "Arrastra imágenes o haz clic · JPG, PNG, WEBP"}</div>
        <input id="photo-upload-input" type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => { upload(e.target.files); e.target.value = ""; }} />
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
                  <div onClick={() => setLightbox(idx)} style={{ aspectRatio: "4/3", backgroundImage: `url(${getPhotoSrc(ph)})`, backgroundSize: "cover", backgroundPosition: "center", cursor: "zoom-in" }} />
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
            <img src={getPhotoSrc(photos[lightbox])} alt={photos[lightbox].caption || photos[lightbox].name} style={{ maxWidth: "82vw", maxHeight: "72vh", objectFit: "contain", borderRadius: 8, display: "block" }} />
            {photos[lightbox].caption && <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", maxWidth: 500, textAlign: "center", lineHeight: 1.5 }}>{photos[lightbox].caption}</div>}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: .5 }}>{lightbox + 1} / {photos.length}</div>
          </div>
          {photos.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setLightbox(l => (l - 1 + photos.length) % photos.length); }} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.ArrowL size={20} /></button>
            <button onClick={e => { e.stopPropagation(); setLightbox(l => (l + 1) % photos.length); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.ArrowR size={20} /></button>
          </>}
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.13)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.X size={16} /></button>
          <button onClick={e => { e.stopPropagation(); remove(photos[lightbox].id); }} style={{ position: "absolute", top: 14, left: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(180,30,30,.4)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Trash size={15} /></button>
        </div>
      )}
    </div>
  );
}
