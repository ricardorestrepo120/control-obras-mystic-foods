const SB_URL = "https://onzlwbaoypydslvvrfdr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemx3YmFveXB5ZHNsdnZyZmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjMyODEsImV4cCI6MjA5MzU5OTI4MX0.y4ZEj6wh3PsNC4Sp2k_1D3JouZnf3UX7T5eSQsxIgPs";
const SB_HDR = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
};

const sbFetch = (path, opts = {}) =>
  fetch(`${SB_URL}/rest/v1${path}`, { ...opts, headers: { ...SB_HDR, ...(opts.headers || {}) } });

export const db = {
  async loadAll() {
    const r = await sbFetch("/obras?select=id,data,updated_at&order=created_at.asc");
    if (!r.ok) throw new Error(await r.text());
    // _srv = server's updated_at, used for change detection in polling
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
