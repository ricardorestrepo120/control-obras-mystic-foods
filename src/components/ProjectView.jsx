import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import TopNav from './TopNav.jsx';
import ProjectInfo from './tabs/ProjectInfo.jsx';
import ProjectStatus from './tabs/ProjectStatus.jsx';
import ProjectPhotos from './tabs/ProjectPhotos.jsx';
import ProjectOneDrive from './tabs/ProjectOneDrive.jsx';
import ProjectNotes from './tabs/ProjectNotes.jsx';
import ProjectBitacora from './tabs/ProjectBitacora.jsx';
import ProjectApertura from './tabs/ProjectApertura.jsx';
import ProjectHistory from './tabs/ProjectHistory.jsx';
import ProjectCronograma from './tabs/ProjectCronograma.jsx';
import ProjectMobiliario from './tabs/ProjectMobiliario.jsx';
import { I } from './icons/index.jsx';

const TABS = [
  { id: "info",      label: "Información", Icon: p => <I.DocText   {...p} /> },
  { id: "status",    label: "Preliminares",Icon: p => <I.Layers    {...p} /> },
  { id: "photos",    label: "Fotos",       Icon: p => <I.Camera    {...p} /> },
  { id: "onedrive",  label: "Documentos",  Icon: p => <I.Folder    {...p} /> },
  { id: "notes",      label: "Pendientes",  Icon: p => <I.PenLine   {...p} /> },
  { id: "mobiliario", label: "Mobiliario",  Icon: p => <I.Package   {...p} /> },
  { id: "bitacora",    label: "Visitas",     Icon: p => <I.Notebook  {...p} /> },
  { id: "cronograma", label: "Cronograma",  Icon: p => <I.Calendar  {...p} /> },
  { id: "apertura",   label: "Apertura",    Icon: p => <I.Key       {...p} /> },
  { id: "history",   label: "Historial",   Icon: p => <I.Activity  {...p} /> },
];

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--bd)", overflowX: "auto" }}>
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => onSelect(id)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 12px", marginBottom: -1, background: "transparent", color: active === id ? "var(--tx)" : "var(--tx-3)", border: "none", borderBottom: `2px solid ${active === id ? "var(--accent)" : "transparent"}`, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "color .12s" }}>
          <Icon size={14} />{label}
        </button>
      ))}
    </div>
  );
}

export default function ProjectView({ draft, isNew, upd, setDraft, onBack, onSave, onDelete, onShare, contactForm, setContactForm, saveContact, syncing, syncError, onLogout, userEmail }) {
  const [tab, setTab] = useState("info");
  const timerRef = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const draftKey = useMemo(() => {
    if (isNew || !draft?.name?.trim()) return null;
    const { photos: _p, visitas: _v, mobiliario: _mob, checklist: _cl, ...rest } = draft;
    const visitasMeta = (_v ?? []).map(v => ({
      id: v.id, date: v.date, time: v.time, quien: v.quien,
      observaciones: v.observaciones, _pc: v.photos?.length ?? 0,
    }));
    const mobMeta = (_mob ?? []).map(m => ({
      id: m.id, nombre: m.nombre, cantidad: m.cantidad,
      proveedor: m.proveedor, estado: m.estado, _fid: m.foto?.id ?? null,
    }));
    const clMeta = (_cl ?? []).map(c => ({
      id: c.id, text: c.text, done: c.done, assignee: c.assignee,
      reminder: c.reminder, comment: c.comment, _pc: c.photos?.length ?? 0,
    }));
    // Track captions so a caption-only edit also fires autosave
    const captionHash = (_p ?? []).map(p => `${p.id}:${p.caption ?? ""}`).join("|");
    return JSON.stringify({ ...rest, _pc: _p?.length ?? 0, _vm: visitasMeta, _mob: mobMeta, checklist: clMeta, _ch: captionHash });
  }, [draft, isNew]);

  useEffect(() => {
    if (!draftKey) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(draftRef.current), 2000);
    return () => clearTimeout(timerRef.current);
  }, [draftKey, onSave]);

  const handleTabChange = useCallback(nextTab => {
    if (!isNew && draftRef.current?.name?.trim()) {
      clearTimeout(timerRef.current);
      onSave(draftRef.current);
    }
    setTab(nextTab);
  }, [isNew, onSave]);

  const handleBack = () => {
    clearTimeout(timerRef.current);
    if (!isNew && draftRef.current?.name?.trim()) onSave(draftRef.current);
    onBack();
  };


  return (
    <div style={{ minHeight: "100vh" }}>
      <TopNav project={draft} isNew={isNew} onBack={handleBack} onSave={() => onSave(draftRef.current)} onDelete={onDelete} onShare={onShare} canSave={!!draft.name?.trim()} syncing={syncing} syncError={syncError} onLogout={onLogout} userEmail={userEmail} />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px var(--pp) 80px" }}>
        {!isNew && <TabBar tabs={TABS} active={tab} onSelect={handleTabChange} />}
        {(tab === "info"     || isNew) && <ProjectInfo     draft={draft} isNew={isNew} upd={upd} contactForm={contactForm} setContactForm={setContactForm} saveContact={saveContact} />}
        {!isNew && tab === "status"    && <ProjectStatus   draft={draft} upd={upd} setDraft={setDraft} />}
        {!isNew && tab === "photos"    && <ProjectPhotos   draft={draft} setDraft={setDraft} />}
        {!isNew && tab === "onedrive"  && <ProjectOneDrive draft={draft} upd={upd} />}
        {!isNew && tab === "notes"      && <ProjectNotes      draft={draft} upd={upd} />}
        {!isNew && tab === "mobiliario" && <ProjectMobiliario draft={draft} upd={upd} />}
        {!isNew && tab === "bitacora"    && <ProjectBitacora   draft={draft} setDraft={setDraft} />}
        {!isNew && tab === "cronograma" && <ProjectCronograma draft={draft} setDraft={setDraft} />}
        {!isNew && tab === "apertura"   && <ProjectApertura   draft={draft} upd={upd} setDraft={setDraft} />}
        {!isNew && tab === "history"   && <ProjectHistory  draft={draft} />}
      </div>
    </div>
  );
}
