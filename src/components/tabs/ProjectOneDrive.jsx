import { useState } from 'react';
import Card from '../ui/Card.jsx';
import SecLabel from '../ui/SecLabel.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Input from '../ui/Input.jsx';
import Empty from '../ui/Empty.jsx';
import { I, OneDriveLogo } from '../icons/index.jsx';
import { col, fx } from '../../lib/utils.js';
import { DEFAULT_ONEDRIVEFOLDERS } from '../../lib/dataModel.js';

export default function ProjectOneDrive({ draft, upd }) {
  const folders = draft.onedriveFolders ?? DEFAULT_ONEDRIVEFOLDERS();
  const [editingId, setEditingId] = useState(null);

  const updateFolder = (id, ch) => upd("onedriveFolders", prev => prev.map(f => f.id === id ? { ...f, ...ch } : f));
  const addFolder    = () => upd("onedriveFolders", prev => [...prev, { id: `f-${crypto.randomUUID()}`, label: "Nueva carpeta", url: "" }]);
  const removeFolder = id => upd("onedriveFolders", prev => prev.filter(f => f.id !== id));
  const openUrl = url => {
    const t = url.trim();
    if (!t) return;
    if (/^(javascript|data|vbscript):/i.test(t)) return;
    window.open(/^https?:\/\//i.test(t) ? t : `https://${t}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fu" style={col({ gap: 14 })}>
      <Card style={{ padding: 18 }}>
        <div style={fx({ gap: 12 })}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#e8f1fb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><OneDriveLogo size={26} /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)", marginBottom: 3 }}>OneDrive</div>
            <div style={{ fontSize: 12, color: "var(--tx-3)", lineHeight: 1.5 }}>Vincula carpetas de OneDrive para acceder a los documentos de esta obra directamente.</div>
          </div>
        </div>
      </Card>
      <Card>
        <SecLabel action={<Btn size="sm" variant="soft" icon={<I.Plus size={13} />} onClick={addFolder}>Agregar carpeta</Btn>}>Carpetas vinculadas</SecLabel>
        {folders.length === 0 && <Empty icon={<I.Folder size={20} />} title="Sin carpetas" hint="Agrega el link de una carpeta de OneDrive" />}
        <div style={col({ gap: 10 })}>
          {folders.map(f => (
            <div key={f.id} style={{ background: "var(--bg-soft)", borderRadius: 12, padding: 14 }}>
              <div style={fx({ gap: 8, marginBottom: 10 })}>
                <OneDriveLogo size={18} />
                {editingId === f.id
                  ? <Input value={f.label} onChange={e => updateFolder(f.id, { label: e.target.value })} onBlur={() => setEditingId(null)} onKeyDown={e => { if (e.key === "Enter") setEditingId(null); }} autoFocus style={{ height: 30, fontSize: 13, fontWeight: 600 }} />
                  : <span onClick={() => setEditingId(f.id)} title="Clic para editar nombre" style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", cursor: "text", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label || "Sin nombre"}</span>}
                <IconBtn icon={<I.Trash size={13} />} onClick={() => removeFolder(f.id)} title="Eliminar carpeta" danger />
              </div>
              <div style={fx({ gap: 8 })}>
                <Input value={f.url} onChange={e => updateFolder(f.id, { url: e.target.value })} placeholder="Pega aquí el link de OneDrive…" style={{ fontSize: 12 }} />
                <Btn variant={f.url.trim() ? "primary" : "ghost"} size="sm" disabled={!f.url.trim()} onClick={() => openUrl(f.url)}>Abrir</Btn>
              </div>
              {f.url.trim() && <div style={{ marginTop: 8, fontSize: 11, color: "var(--info)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔗 {f.url}</div>}
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ padding: 16 }}>
        <SecLabel>¿Cómo obtener el link?</SecLabel>
        <div style={col({ gap: 6, fontSize: 12, color: "var(--tx-3)", lineHeight: 1.7 })}>
          <div>1. Abre <strong style={{ color: "var(--tx-2)" }}>OneDrive</strong> en tu navegador.</div>
          <div>2. Navega a la carpeta de esta obra.</div>
          <div>3. Clic derecho → <strong style={{ color: "var(--tx-2)" }}>Compartir</strong> → <strong style={{ color: "var(--tx-2)" }}>Copiar link</strong>.</div>
          <div>4. Pega el link arriba y guarda la obra.</div>
        </div>
      </Card>
    </div>
  );
}
