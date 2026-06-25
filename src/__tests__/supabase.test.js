import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, storage, setAuthToken } from '../lib/supabase.js';

// The anon key embedded in supabase.js — used to verify default token
const SB_URL  = 'https://onzlwbaoypydslvvrfdr.supabase.co';
const BUCKET  = 'obras-fotos';

// Minimal valid JPEG data-URL (single white pixel, ~100 bytes base64)
const VALID_DATA_URL = 'data:image/jpeg;base64,' + btoa('fake-jpeg-data-for-testing');

// ── shared setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset module-level _tok to anon key before each test
  setAuthToken(null);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── helpers ──────────────────────────────────────────────────────────────────

const okFetch = (json = []) =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(json) });

const failFetch = (status, body = '') =>
  vi.fn().mockResolvedValue({
    ok:         false,
    status,
    statusText: String(status),
    text:       () => Promise.resolve(body),
    json:       () => Promise.resolve({}),
  });

// ─── db.save ──────────────────────────────────────────────────────────────────

describe('db.save', () => {
  it('POSTs to /rest/v1/obras', async () => {
    const mockFetch = okFetch();
    vi.stubGlobal('fetch', mockFetch);

    await db.save({ id: 'p-1', name: 'Test' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/rest/v1/obras');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
  });

  it('sends the JWT in the Authorization header when set', async () => {
    const mockFetch = okFetch();
    vi.stubGlobal('fetch', mockFetch);
    setAuthToken('my-jwt-token');

    await db.save({ id: 'p-1', name: 'Test' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer my-jwt-token');
  });

  it('always includes the apikey header', async () => {
    const mockFetch = okFetch();
    vi.stubGlobal('fetch', mockFetch);

    await db.save({ id: 'p-1', name: 'Test' });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['apikey']).toBeTruthy();
  });

  it('sends project data as JSON body', async () => {
    const mockFetch = okFetch();
    vi.stubGlobal('fetch', mockFetch);

    await db.save({ id: 'p-42', name: 'Mi obra', brand: 'olivia' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.id).toBe('p-42');
    expect(body.data.name).toBe('Mi obra');
  });

  it('strips _srv from the saved data payload', async () => {
    const mockFetch = okFetch();
    vi.stubGlobal('fetch', mockFetch);

    await db.save({ id: 'p-1', name: 'X', _srv: '2024-01-01T00:00:00Z' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data._srv).toBeUndefined();
  });

  it('throws when the server responds with an error', async () => {
    vi.stubGlobal('fetch', failFetch(401, 'Unauthorized'));

    await expect(db.save({ id: 'p-1', name: 'X' })).rejects.toThrow();
  });
});

// ─── db.remove ────────────────────────────────────────────────────────────────

describe('db.remove', () => {
  it('uses DELETE method', async () => {
    const mockFetch = okFetch([{ id: 'p-1' }]);
    vi.stubGlobal('fetch', mockFetch);

    await db.remove('p-1');

    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('builds URL with ?id=eq.<id> filter', async () => {
    const mockFetch = okFetch([{ id: 'p-abc' }]);
    vi.stubGlobal('fetch', mockFetch);

    await db.remove('p-abc');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('id=eq.p-abc');
  });

  it('URL-encodes the project ID', async () => {
    const mockFetch = okFetch([{ id: 'p-a b' }]);
    vi.stubGlobal('fetch', mockFetch);

    await db.remove('p-a b');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('id=eq.p-a%20b');
  });

  it('throws RLS error when the server returns an empty array (no rows deleted)', async () => {
    vi.stubGlobal('fetch', okFetch([]));

    await expect(db.remove('p-1')).rejects.toThrow(/RLS/i);
  });

  it('includes Authorization header', async () => {
    const mockFetch = okFetch([{ id: 'p-1' }]);
    vi.stubGlobal('fetch', mockFetch);
    setAuthToken('delete-jwt');

    await db.remove('p-1');

    expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer delete-jwt');
  });

  it('throws when the server responds with an HTTP error', async () => {
    vi.stubGlobal('fetch', failFetch(403, 'Forbidden'));

    await expect(db.remove('p-1')).rejects.toThrow();
  });
});

// ─── storage.upload ───────────────────────────────────────────────────────────

describe('storage.upload', () => {
  it('uses PUT method', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await storage.upload(VALID_DATA_URL, 'proj-1', 'photo-1');

    expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
  });

  it('constructs URL as /object/<bucket>/<projectId>/<photoId>.jpg', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await storage.upload(VALID_DATA_URL, 'p-project', 'ph-photo');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/object/${BUCKET}/p-project/ph-photo.jpg`);
  });

  it('returns the public URL with correct shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const result = await storage.upload(VALID_DATA_URL, 'p-proj', 'ph-img');

    expect(result).toBe(
      `${SB_URL}/storage/v1/object/public/${BUCKET}/p-proj/ph-img.jpg`
    );
  });

  it('includes x-upsert: "true" header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await storage.upload(VALID_DATA_URL, 'p-1', 'ph-1');

    expect(mockFetch.mock.calls[0][1].headers['x-upsert']).toBe('true');
  });

  it('sends the JWT in the Authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    setAuthToken('upload-jwt');

    await storage.upload(VALID_DATA_URL, 'p-1', 'ph-1');

    expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe('Bearer upload-jwt');
  });

  it('includes apikey header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await storage.upload(VALID_DATA_URL, 'p-1', 'ph-1');

    expect(mockFetch.mock.calls[0][1].headers['apikey']).toBeTruthy();
  });

  it('throws a descriptive error for 403 (RLS denied)', async () => {
    vi.stubGlobal('fetch', failFetch(403, 'Access denied'));

    await expect(storage.upload(VALID_DATA_URL, 'p-1', 'ph-1'))
      .rejects.toThrow('403');
  });

  it('throws a descriptive error for 404 (bucket not found)', async () => {
    vi.stubGlobal('fetch', failFetch(404, 'Not found'));

    await expect(storage.upload(VALID_DATA_URL, 'p-1', 'ph-1'))
      .rejects.toThrow('404');
  });

  it('throws for dataUrl without a comma (not a valid data URL)', async () => {
    await expect(storage.upload('not-a-data-url', 'p-1', 'ph-1'))
      .rejects.toThrow();
  });

  it('throws for null dataUrl', async () => {
    await expect(storage.upload(null, 'p-1', 'ph-1'))
      .rejects.toThrow();
  });
});
