import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Dashboard from './components/Dashboard.jsx';
import ProjectView from './components/ProjectView.jsx';
import ShareModal from './components/ShareModal.jsx';
import SharedView from './components/SharedView.jsx';
import LoginView from './components/LoginView.jsx';
import Modal from './components/ui/Modal.jsx';
import Toast from './components/ui/Toast.jsx';
import Btn from './components/ui/Btn.jsx';
import { I } from './components/icons/index.jsx';
import { db, auth } from './lib/supabase.js';
import { migrate, makeProject, readShareHash, fitPhotosToLimit } from './lib/dataModel.js';
import { fx } from './lib/utils.js';

export default function App() {
  const sharedProject = useMemo(() => readShareHash(), []);

  const [authReady,    setAuthReady]    = useState(false);
  const [session,      setSession]      = useState(null);
  const [projects,     setProjects]     = useState([]);
  const [loaded,       setLoaded]       = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [syncError,    setSyncError]    = useState(false);
  const [route,        setRoute]        = useState({ view: "dash" });
  const [draft,        setDraft]        = useState(null);
  const [isNew,        setIsNew]        = useState(false);
  const [filter,       setFilter]       = useState("all");
  const [sortBy,       setSortBy]       = useState("createdAt");
  const [query,        setQuery]        = useState("");
  const [contactForm,  setContactForm]  = useState(null);
  const [toast,        setToast]        = useState({ show: false, text: "" });
  const [delModal,     setDelModal]     = useState(null);
  const [shareOpen,    setShareOpen]    = useState(false);
  const toastTimerRef  = useRef(null);
  const deletedIdsRef  = useRef(new Set());
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const handleLogout = useCallback(async () => {
    await auth.signOut();
    setSession(null);
    setLoaded(false);
    setProjects([]);
    setDraft(null);
    setIsNew(false);
    setRoute({ view: "dash" });
    setDelModal(null);
    setShareOpen(false);
    deletedIdsRef.current.clear();
  }, []);

  // Restore stored session on mount (skip for shared links)
  useEffect(() => {
    if (sharedProject) { setAuthReady(true); return; }
    auth.restoreSession()
      .then(s => { setSession(s); setAuthReady(true); })
      .catch(() => { setAuthReady(true); });
  }, []);

  // Load projects once authenticated
  useEffect(() => {
    if (!session || loaded) return;
    setSyncing(true);
    db.loadAll()
      .then(rows => { setProjects(rows.map(migrate)); setSyncError(false); })
      .catch(err  => { console.error("Load failed:", err); setSyncError(true); })
      .finally(()  => { setSyncing(false); setLoaded(true); });
  }, [session, loaded]);

  // Auto-refresh token 5 minutes before it expires
  useEffect(() => {
    if (!session?.expires_at) return;
    const delay = Math.max(0, session.expires_at - Date.now() - 5 * 60_000);
    const id = setTimeout(async () => {
      const s = await auth.refresh(session.refresh_token);
      if (s) setSession(s);
      else handleLogout();
    }, delay);
    return () => clearTimeout(id);
  }, [session?.expires_at, handleLogout]);

  useEffect(() => {
    if (sharedProject) return;
    const onPop = () => { setDelModal(null); setShareOpen(false); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [sharedProject]);

  // Auto-logout after 2 hours of inactivity (no click, keydown, or scroll)
  useEffect(() => {
    if (!session || sharedProject) return;
    const IDLE_MS = 2 * 60 * 60_000;
    let timer = setTimeout(handleLogout, IDLE_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(handleLogout, IDLE_MS); };
    window.addEventListener("click",   reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("scroll",  reset, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click",   reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("scroll",  reset);
    };
  }, [session, sharedProject, handleLogout]);

  // Background polling every 30 s (only when authenticated and loaded)
  useEffect(() => {
    if (!loaded || sharedProject || !session) return;
    const tick = async () => {
      try {
        const rows = await db.loadAll();
        const fresh = rows.map(migrate).filter(fp => !deletedIdsRef.current.has(fp.id));
        setProjects(prev => {
          const serverMap = new Map(fresh.map(fp => [fp.id, fp]));
          const prevIds   = new Set(prev.map(p => p.id));
          let changed = false;
          const next = prev.map(cp => {
            const fp = serverMap.get(cp.id);
            if (fp && (!cp._srv || fp._srv > cp._srv)) { changed = true; return fp; }
            return cp;
          });
          fresh.forEach(fp => {
            if (!prevIds.has(fp.id)) { changed = true; next.push(fp); }
          });
          return changed ? next : prev;
        });
      } catch (err) {
        // Auth failure (expired/revoked token): force logout so user can re-authenticate
        if (err.status === 401 || err.status === 403) handleLogout();
      }
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [loaded, sharedProject, session, handleLogout]);

  const showToast = useCallback(text => {
    setToast({ show: true, text });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast({ show: false, text: "" }), 2500);
  }, []);

  const handleLogin = useCallback(s => setSession(s), []);

  // Accepts a plain value or an updater function (field, prev => next)
  const upd = useCallback((field, val) =>
    setDraft(d => ({ ...d, [field]: typeof val === "function" ? val(d[field]) : val })), []);

  const openProject = id => {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    setDraft(migrate(JSON.parse(JSON.stringify(p))));
    setIsNew(false); setRoute({ view: "proj" }); setContactForm(null);
  };

  const newProject = () => {
    setDraft(makeProject());
    setIsNew(true); setRoute({ view: "proj" }); setContactForm(null);
  };

  const save = useCallback(async (projectToSave) => {
    if (!projectToSave?.name?.trim()) return;
    if (deletedIdsRef.current.has(projectToSave.id)) return;
    const fittedPhotos = await fitPhotosToLimit(projectToSave.photos ?? []);
    const fittedVisitas = await Promise.all(
      (projectToSave.visitas ?? []).map(async v => ({
        ...v,
        photos: await fitPhotosToLimit(v.photos ?? []),
      }))
    );
    const pToSave = { ...projectToSave, photos: fittedPhotos, visitas: fittedVisitas, _srv: new Date().toISOString() };
    setProjects(prev => prev.find(x => x.id === pToSave.id) ? prev.map(x => x.id === pToSave.id ? pToSave : x) : [...prev, pToSave]);
    // Guard: only update draft if user is still viewing this same project
    setDraft(prev => prev?.id === pToSave.id ? { ...prev, photos: pToSave.photos, visitas: pToSave.visitas } : prev);
    setIsNew(false);
    setSyncing(true);
    db.save(pToSave)
      .then(() => { setSyncError(false); showToast("Cambios guardados"); })
      .catch(err => {
        setSyncError(true);
        showToast("Error al guardar. Intenta de nuevo.");
        console.error(err);
      })
      .finally(() => setSyncing(false));
  }, [showToast]);

  const saveContact = c => {
    if (!c.name.trim()) return;
    setDraft(d => ({
      ...d,
      contacts: (d.contacts ?? []).find(x => x.id === c.id)
        ? (d.contacts ?? []).map(x => x.id === c.id ? c : x)
        : [...(d.contacts ?? []), c],
    }));
    setContactForm(null);
  };

  const confirmDelete = () => {
    if (delModal.step === 1) { setDelModal(m => ({ ...m, step: 2 })); return; }
    const id = delModal.id;
    deletedIdsRef.current.add(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setDelModal(null); setRoute({ view: "dash" });
    setSyncing(true);
    db.remove(id)
      .then(() => { setSyncError(false); showToast("Obra eliminada"); })
      .catch(err => { setSyncError(true); showToast("Error al eliminar"); console.error(err); })
      .finally(() => setSyncing(false));
  };

  // --- Render ---

  if (sharedProject) return <SharedView project={sharedProject} />;

  // Checking stored session or loading initial data
  if (!authReady || (session && !loaded)) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--tx-3)", fontSize: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Logo size={18} /></div>
      {syncError
        ? <div style={{ color: "var(--danger)", fontWeight: 500, textAlign: "center", lineHeight: 1.6 }}>No se pudo conectar a Supabase.<br />Verifica tu conexión a internet.</div>
        : <div>Conectando…</div>}
    </div>
  );

  if (!session) return <LoginView onLogin={handleLogin} />;

  const userEmail = session.user?.email;

  return (
    <div>
      {route.view === "dash" && (
        <Dashboard projects={projects} onOpen={openProject} onNew={newProject}
          filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy}
          query={query} setQuery={setQuery} syncing={syncing} syncError={syncError}
          onLogout={handleLogout} userEmail={userEmail} />
      )}
      {route.view === "proj" && draft && (
        <ProjectView draft={draft} isNew={isNew} upd={upd} setDraft={setDraft}
          onBack={() => setRoute({ view: "dash" })} onSave={save}
          onDelete={() => setDelModal({ step: 1, id: draft.id })} onShare={() => setShareOpen(true)}
          contactForm={contactForm} setContactForm={setContactForm} saveContact={saveContact}
          syncing={syncing} syncError={syncError}
          onLogout={handleLogout} userEmail={userEmail} />
      )}
      {shareOpen && draft && <ShareModal project={draft} onClose={() => setShareOpen(false)} />}
      {delModal && (
        <Modal onClose={() => setDelModal(null)} width={380}>
          <div style={{ padding: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--danger-bg)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <I.AlertT size={20} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", textAlign: "center", marginBottom: 6 }}>
              {delModal.step === 1 ? "¿Eliminar esta obra?" : "Confirmación final"}
            </div>
            <div style={{ fontSize: 13, color: "var(--tx-2)", textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
              {delModal.step === 1 ? <><b>{draft.name}</b> será eliminada permanentemente.</> : <>Esta acción es definitiva. ¿Confirmas?</>}
            </div>
            <div style={fx({ gap: 8, justifyContent: "center" })}>
              <Btn variant="ghost" onClick={() => setDelModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={confirmDelete} style={{ background: "var(--danger)", borderColor: "var(--danger)", color: "white" }}>
                {delModal.step === 1 ? "Sí, eliminar" : "Confirmar"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
      <Toast visible={toast.show}><I.Check size={14} sw={2.5} />{toast.text}</Toast>
    </div>
  );
}
