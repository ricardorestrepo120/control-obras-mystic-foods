const SB_URL = "https://onzlwbaoypydslvvrfdr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemx3YmFveXB5ZHNsdnZyZmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjMyODEsImV4cCI6MjA5MzU5OTI4MX0.y4ZEj6wh3PsNC4Sp2k_1D3JouZnf3UX7T5eSQsxIgPs";
const BASE_HDR = { "Content-Type": "application/json", "apikey": SB_KEY };

// Current bearer token — anon key by default, replaced with JWT after login
let _tok = SB_KEY;
export const setAuthToken = t => { _tok = t ?? SB_KEY; };

const sbFetch = (path, opts = {}) =>
  fetch(`${SB_URL}/rest/v1${path}`, {
    ...opts,
    headers: { ...BASE_HDR, "Authorization": `Bearer ${_tok}`, ...(opts.headers ?? {}) },
  });

const authFetch = (path, opts = {}) =>
  fetch(`${SB_URL}/auth/v1${path}`, {
    ...opts,
    headers: { ...BASE_HDR, ...(opts.headers ?? {}) },
  });

const SESSION_KEY = "co_session";

export const db = {
  async loadAll() {
    const r = await sbFetch("/obras?select=id,data,updated_at&order=created_at.asc");
    if (!r.ok) throw new Error(await r.text());
    return (await r.json()).map(row => ({ ...row.data, id: row.id, _srv: row.updated_at }));
  },
  async save(p) {
    const { _srv, ...clean } = p;
    const r = await sbFetch("/obras", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: clean.id, data: clean, updated_at: _srv ?? new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(await r.text());
  },
  async remove(id) {
    const r = await sbFetch(`/obras?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) throw new Error(await r.text());
  },
};

export const auth = {
  async signIn(email, password) {
    const r = await authFetch("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error_description ?? body.message ?? "Error al iniciar sesión");
    return auth._persist({
      access_token:  body.access_token,
      refresh_token: body.refresh_token,
      expires_at:    Date.now() + body.expires_in * 1000,
      user:          body.user,
    });
  },

  async signOut() {
    try {
      await authFetch("/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${_tok}` },
      });
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    setAuthToken(null);
  },

  async restoreSession() {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
    if (!stored) return null;
    // Token still valid (with 60-second buffer) — use it directly
    if (stored.expires_at > Date.now() + 60_000) {
      setAuthToken(stored.access_token);
      return stored;
    }
    return auth.refresh(stored.refresh_token);
  },

  async refresh(refreshToken) {
    if (!refreshToken) { localStorage.removeItem(SESSION_KEY); setAuthToken(null); return null; }
    try {
      const r = await authFetch("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const body = await r.json();
      if (!r.ok) { localStorage.removeItem(SESSION_KEY); setAuthToken(null); return null; }
      return auth._persist({
        access_token:  body.access_token,
        refresh_token: body.refresh_token,
        expires_at:    Date.now() + body.expires_in * 1000,
        user:          body.user,
      });
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setAuthToken(null);
      return null;
    }
  },

  _persist(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setAuthToken(session.access_token);
    return session;
  },
};
