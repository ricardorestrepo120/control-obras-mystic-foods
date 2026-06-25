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

// ── Supabase Storage ──────────────────────────────────────────────────────
// Bucket "obras-fotos" must exist and be public in the Supabase dashboard.
// RLS policies required:
//   INSERT: authenticated users (role = 'authenticated')
//   DELETE: authenticated users
//   SELECT: public (anon role) — so public URLs work without auth

const BUCKET = "obras-fotos";

const storageFetch = (path, opts = {}) =>
  fetch(`${SB_URL}/storage/v1${path}`, {
    ...opts,
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${_tok}`, ...(opts.headers ?? {}) },
  });

export const storage = {
  // Uploads a compressed dataUrl to Storage and returns its public URL.
  // Uses atob() instead of fetch(dataUrl) — some desktop browsers block
  // fetch() on data: URLs due to CSP restrictions.
  async upload(dataUrl, projectId, photoId) {
    // ── Step 1: data URL → Blob ──────────────────────────────────────────
    let blob;
    try {
      const comma = dataUrl?.indexOf(',') ?? -1;
      if (comma === -1) throw new Error('El dataUrl no contiene coma — no es un data URL válido');
      const mime = dataUrl.slice(5, comma).replace(';base64', '') || 'image/jpeg';
      const b64  = dataUrl.slice(comma + 1);
      const bin  = atob(b64);
      const buf  = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      blob = new Blob([buf], { type: mime });
    } catch (err) {
      console.error('[storage.upload] error creando blob:', err);
      throw new Error(`Error creando blob: ${err.message}`);
    }

    // ── Step 2: PUT al bucket (upsert) ──────────────────────────────────
    // PUT + x-upsert:true is the correct verb for Supabase Storage upsert;
    // POST also works on new files but some RLS policies reject it on re-upload.
    const path = `${projectId}/${photoId}.jpg`;

    let r;
    try {
      r = await storageFetch(`/object/${BUCKET}/${path}`, {
        method: "PUT",
        headers: { "Content-Type": blob.type, "x-upsert": "true" },
        body: blob,
      });
    } catch (err) {
      console.error('[storage.upload] error de red:', err);
      throw new Error(`Error de red al subir: ${err.message}`);
    }

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error(`[storage.upload] ❌ HTTP ${r.status} — ${BUCKET}/${path}:`, body);
      // Surface a human-readable message based on status
      if (r.status === 400) throw new Error(`Storage 400 — request inválido: ${body}`);
      if (r.status === 401) throw new Error('Storage 401 — no autenticado. Vuelve a iniciar sesión.');
      if (r.status === 403) throw new Error('Storage 403 — acceso denegado. Verifica las políticas RLS del bucket "obras-fotos".');
      if (r.status === 404) throw new Error('Storage 404 — bucket "obras-fotos" no encontrado. Créalo en el dashboard de Supabase.');
      throw new Error(`Storage ${r.status}: ${body || r.statusText}`);
    }

    return `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  },

  // Deletes objects by their storage paths. Best-effort — logs but never throws.
  async remove(paths) {
    if (!paths?.length) return;
    try {
      const r = await storageFetch(`/object/${BUCKET}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: paths }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        console.warn(`[storage.remove] HTTP ${r.status}:`, body);
      }
    } catch (err) {
      console.warn('[storage.remove] error:', err);
    }
  },
};

const SESSION_KEY = "co_session";

// Throws an error with a `.status` property so callers can distinguish
// auth failures (401/403) from other HTTP errors.
const assertOk = async r => {
  if (!r.ok) {
    const text = await r.text();
    const err = new Error(text);
    err.status = r.status;
    throw err;
  }
  return r;
};

export const db = {
  async loadAll() {
    const r = await assertOk(await sbFetch("/obras?select=id,data,updated_at&order=created_at.asc"));
    return (await r.json()).map(row => ({ ...row.data, id: row.id, _srv: row.updated_at }));
  },
  async save(p) {
    const { _srv, ...clean } = p;
    await assertOk(await sbFetch("/obras", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: clean.id, data: clean, updated_at: _srv ?? new Date().toISOString() }),
    }));
  },
  async remove(id) {
    const r = await assertOk(await sbFetch(`/obras?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Prefer": "return=representation" },
    }));
    const deleted = await r.json();
    if (deleted.length === 0) throw new Error("DELETE bloqueado por RLS — agrega política DELETE en Supabase");
  },
};

export const auth = {
  async signIn(email, password) {
    const r = await authFetch("/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    let body;
    try { body = await r.json(); } catch { throw new Error("Error al iniciar sesión"); }
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
      if (!r.ok || !body.access_token) { localStorage.removeItem(SESSION_KEY); setAuthToken(null); return null; }
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
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* private mode quota */ }
    setAuthToken(session.access_token);
    return session;
  },
};
