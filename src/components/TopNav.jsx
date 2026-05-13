import Btn from './ui/Btn.jsx';
import BrandChip from './ui/BrandChip.jsx';
import { I } from './icons/index.jsx';
import { fx } from '../lib/utils.js';

export default function TopNav({ onNew, onBack, project, isNew, onSave, onDelete, onShare, canSave, syncing, syncError, onLogout, userEmail }) {
  const sc = syncError ? "var(--danger)" : syncing ? "var(--warn)" : "var(--ok)";
  const sl = syncError ? "Sin conexión" : syncing ? "Guardando…" : "Sincronizado";
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "color-mix(in oklch,var(--bg) 88%,transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--bd)" }}>
      <div style={fx({ maxWidth: 1100, margin: "0 auto", height: 56, gap: 8, padding: "0 var(--pp)" })}>
        {onBack
          ? <Btn variant="ghost" size="sm" icon={<I.ArrowL size={14} />} onClick={onBack}>Volver</Btn>
          : <div style={fx({ gap: 8 })}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><I.Logo size={14} /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)", letterSpacing: -.3, lineHeight: 1.1 }}>Mystic Foods</div>
                <div style={{ fontSize: 9, fontWeight: 500, color: "var(--tx-3)", letterSpacing: .4, textTransform: "uppercase" }}>Control de Obras</div>
              </div>
            </div>}
        {project && (
          <div style={{ flex: 1, minWidth: 0, marginLeft: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isNew ? "Nueva obra" : project.name || "Sin nombre"}</div>
            {!isNew && <BrandChip id={project.brand} size="sm" />}
          </div>
        )}
        <div style={{ flex: project ? "0" : "1" }} />
        <div title={sl} style={fx({ gap: 5 })}><span style={{ width: 7, height: 7, borderRadius: "50%", background: sc, flexShrink: 0 }} /></div>
        {onLogout && <Btn variant="ghost" size="sm" icon={<I.LogOut size={14} />} onClick={onLogout} title={userEmail ?? "Cerrar sesión"}>Salir</Btn>}
        {!project && <Btn variant="primary" size="sm" icon={<I.Plus size={14} />} onClick={onNew}>Nueva obra</Btn>}
        {project && !isNew && onShare && <Btn variant="ghost" size="sm" icon={<I.Share size={14} />} onClick={onShare} title="Compartir" />}
        {project && !isNew && <Btn variant="ghost" size="sm" icon={<I.Trash size={14} />} onClick={onDelete} title="Eliminar" />}
        {project && <Btn variant="primary" size="sm" icon={<I.Check size={14} />} onClick={onSave} disabled={!canSave}>{isNew ? "Crear" : "Guardar"}</Btn>}
      </div>
    </div>
  );
}
