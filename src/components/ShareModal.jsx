import { useState, useMemo, useEffect } from 'react';
import Modal from './ui/Modal.jsx';
import Btn from './ui/Btn.jsx';
import Input from './ui/Input.jsx';
import Lbl from './ui/Lbl.jsx';
import { I } from './icons/index.jsx';
import { fx } from '../lib/utils.js';
import { encodeShare } from '../lib/dataModel.js';

export default function ShareModal({ project, onClose }) {
  const [copied, setCopied] = useState(false);
  const encoded = useMemo(() => encodeShare(project), [project]);
  const url = useMemo(() => encoded ? `${window.location.href.split("#")[0]}#share=${encoded}` : null, [encoded]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable or denied — do nothing
    }
  };

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Modal onClose={onClose} width={500}>
      <div style={{ padding: 24 }}>
        <div style={fx({ gap: 10, marginBottom: 14 })}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--info-bg)", color: "var(--info)", display: "flex", alignItems: "center", justifyContent: "center" }}><I.Share size={16} /></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)" }}>Compartir obra</div>
            <div style={{ fontSize: 12, color: "var(--tx-3)" }}>Link de solo lectura · {project.name}</div>
          </div>
        </div>
        {!url
          ? <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 10, padding: "12px 14px", fontSize: 13, marginBottom: 14 }}>
              No se pudo generar el link. El proyecto puede ser demasiado grande. Intenta eliminar algunas fotos primero.
            </div>
          : <>
              <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 11, color: "var(--tx-3)", lineHeight: 1.6 }}>Quien abra este link verá una vista de solo lectura. No podrá editar nada.</div>
              <Lbl>URL del link</Lbl>
              <div style={fx({ gap: 6 })}>
                <Input value={url} readOnly onClick={e => e.target.select()} style={{ fontFamily: "monospace", fontSize: 11 }} />
                <Btn variant={copied ? "soft" : "primary"} icon={copied ? <I.Check size={13} /> : <I.Copy size={13} />} onClick={copy}>{copied ? "Copiado" : "Copiar"}</Btn>
              </div>
            </>}
        <div style={fx({ gap: 8, marginTop: 18, justifyContent: "flex-end" })}>
          {url && <Btn variant="ghost" icon={<I.Eye size={13} />} onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Vista previa</Btn>}
          <Btn variant="text" onClick={onClose}>Cerrar</Btn>
        </div>
      </div>
    </Modal>
  );
}
