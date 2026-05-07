import { useState } from 'react';
import { I } from './icons/index.jsx';
import { auth } from '../lib/supabase.js';
import { col } from '../lib/utils.js';

export default function LoginView({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const submit = async e => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const session = await auth.signIn(email.trim(), password);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", height: 42, padding: "0 12px",
    background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 8,
    fontSize: 14, color: "var(--tx)", outline: "none", boxSizing: "border-box",
    transition: "border-color .15s",
  };
  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "var(--tx-2)", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <div className="fu" style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--accent)", color: "var(--bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <I.Logo size={24} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--tx)", letterSpacing: -.5 }}>Mystic Foods</div>
          <div style={{ fontSize: 13, color: "var(--tx-3)", marginTop: 4 }}>Control de Obras</div>
        </div>

        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 14, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 20 }}>Iniciar sesión</div>
          <form onSubmit={submit} style={col({ gap: 14 })}>
            <div>
              <label style={labelStyle}>Correo electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@mistico.co" required autoFocus autoComplete="email"
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--bd)"; }}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--bd)"; }}
                style={inputStyle}
              />
            </div>
            {error && (
              <div style={{ background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              style={{
                height: 42, width: "100%", marginTop: 2,
                background: loading || !email.trim() || !password ? "var(--bg-soft)" : "var(--accent)",
                color: loading || !email.trim() || !password ? "var(--tx-3)" : "var(--bg)",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: loading || !email.trim() || !password ? "default" : "pointer",
                transition: "all .15s",
              }}
            >
              {loading ? "Iniciando sesión…" : "Entrar"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--tx-4)", lineHeight: 1.5 }}>
          Las cuentas son creadas por el administrador.
        </div>
      </div>
    </div>
  );
}
