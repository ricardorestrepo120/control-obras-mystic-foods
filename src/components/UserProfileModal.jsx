import { useState, useEffect } from 'react';
import Modal from './ui/Modal.jsx';
import Btn from './ui/Btn.jsx';
import Input from './ui/Input.jsx';
import Lbl from './ui/Lbl.jsx';
import { I } from './icons/index.jsx';
import { col, fx } from '../lib/utils.js';
import { getProfile, setProfile, requestNotificationPermission } from '../lib/notifications.js';

export default function UserProfileModal({ email, onClose }) {
  const [name, setName] = useState("");
  const [permStatus, setPermStatus] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    const profile = getProfile(email);
    setName(profile.name ?? "");
  }, [email]);

  const handleSave = async () => {
    const trimmed = name.trim();
    setProfile(email, { name: trimmed });
    if (trimmed && permStatus !== "granted" && permStatus !== "unsupported" && permStatus !== "denied") {
      const granted = await requestNotificationPermission();
      setPermStatus(granted ? "granted" : "denied");
    }
    onClose();
  };

  const handleRequestPerm = async () => {
    const granted = await requestNotificationPermission();
    setPermStatus(granted ? "granted" : "denied");
  };

  const permColor = permStatus === "granted" ? "var(--ok)" : permStatus === "denied" ? "var(--danger)" : "var(--warn)";
  const permLabel = { granted: "Activadas", denied: "Bloqueadas por el navegador", default: "Sin configurar", unsupported: "No disponibles en este navegador" }[permStatus] ?? permStatus;

  return (
    <Modal onClose={onClose} width={400}>
      <div style={{ padding: 24 }}>
        <div style={fx({ gap: 12, marginBottom: 22 })}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-soft)", color: "var(--tx-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I.User size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", lineHeight: 1.2 }}>Mi perfil</div>
            <div style={{ fontSize: 12, color: "var(--tx-3)", marginTop: 2 }}>{email}</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <Lbl>Tu nombre (para notificaciones)</Lbl>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ej: Ricardo"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          />
          <div style={{ fontSize: 11, color: "var(--tx-3)", marginTop: 6, lineHeight: 1.6 }}>
            Cuando se te asigne un pendiente en cualquier obra, recibirás una notificación del navegador.
          </div>
        </div>

        <div style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "12px 14px", marginBottom: 22 }}>
          <div style={fx({ gap: 10, justifyContent: "space-between" })}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>Notificaciones del navegador</div>
              <div style={{ fontSize: 11, color: permColor, marginTop: 3, fontWeight: 500 }}>{permLabel}</div>
            </div>
            {permStatus === "default" && (
              <Btn size="sm" variant="soft" onClick={handleRequestPerm}>Activar</Btn>
            )}
          </div>
        </div>

        <div style={fx({ gap: 8, justifyContent: "flex-end" })}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>Guardar</Btn>
        </div>
      </div>
    </Modal>
  );
}
