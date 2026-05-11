import { BRANDS, DEFAULT_ITEMS } from './constants.js';

export const MAX_PHOTOS_BYTES = 700_000;
export const MAX_PHOTO_SIDE   = 900;
export const PHOTO_QUALITY    = 0.65;

export function calcProgress(p) {
  const pl = p.statusItems ?? [], cl = p.checklist ?? [], ap = p.aperturaItems ?? [];
  const sc = (arr, fn, w) => arr.length ? { v: arr.reduce((a, x) => a + fn(x), 0) / arr.length, w } : null;
  const parts = [
    sc(pl, x => x.state === "Aprobado" ? 1 : x.state === "En aprobación" ? .6 : x.state === "Diseñado" ? .3 : 0, .4),
    sc(cl, x => x.done ? 1 : 0, .3),
    sc(ap, x => x.state === "OK" ? 1 : 0, .3),
  ].filter(Boolean);
  if (!parts.length) return 0;
  const tw = parts.reduce((a, p) => a + p.w, 0);
  return Math.round(parts.reduce((a, p) => a + p.v * p.w, 0) / tw * 100);
}

export const addHistory = (proj, ev) => {
  const now = Date.now();
  return { ...proj, history: [{ id: `h-${now}`, t: now, ...ev }, ...(proj.history ?? [])] };
};

// Compress a File/Blob to a JPEG data URL. Used by photo upload in multiple tabs.
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > MAX_PHOTO_SIDE || h > MAX_PHOTO_SIDE) {
        const r = Math.min(MAX_PHOTO_SIDE / w, MAX_PHOTO_SIDE / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", PHOTO_QUALITY));
    };
    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export function recompressPhoto(dataUrl, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxSide || h > maxSide) {
        const r = Math.min(maxSide / w, maxSide / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function fitPhotosToLimit(photos) {
  if (!photos.length) return photos;
  let result = [...photos];
  let side    = MAX_PHOTO_SIDE;
  let quality = PHOTO_QUALITY;

  for (let attempt = 0; attempt < 6; attempt++) {
    const totalBytes = result.reduce((a, p) => a + (p.data?.length ?? 0), 0);
    if (totalBytes <= MAX_PHOTOS_BYTES) break;
    side    = Math.round(side * 0.75);
    quality = Math.max(0.3, quality - 0.1);
    result  = await Promise.all(result.map(async p => ({
      ...p,
      data: p.data ? await recompressPhoto(p.data, side, quality) : p.data,
    })));
  }
  return result;
}

export const DEFAULT_ONEDRIVEFOLDERS = () => [{ id: "f1", label: "Carpeta principal", url: "" }];

export function makeProject() {
  return {
    id: `p-${crypto.randomUUID()}`,
    name: "", brand: BRANDS[0].id, localNumber: "", localArea: "",
    status: "En planificación", startDate: "", openingDate: "", notes: "",
    createdAt: Date.now(),
    contacts: [],
    statusItems: DEFAULT_ITEMS.map(n => ({ id: n, name: n, state: null, notes: "" })),
    checklist: [], aperturaItems: [], history: [], photos: [], visitas: [],
    onedriveFolders: DEFAULT_ONEDRIVEFOLDERS(),
    cronograma: [],
  };
}

export function migrate(raw) {
  const o = { ...raw };
  if (!Array.isArray(o.contacts))        o.contacts = [];
  if (!Array.isArray(o.checklist))       o.checklist = [];
  if (!Array.isArray(o.aperturaItems))   o.aperturaItems = [];
  if (!Array.isArray(o.history))         o.history = [];
  if (!Array.isArray(o.photos))          o.photos = [];
  if (!Array.isArray(o.visitas))         o.visitas = [];
  if (!Array.isArray(o.onedriveFolders)) o.onedriveFolders = DEFAULT_ONEDRIVEFOLDERS();
  if (!Array.isArray(o.cronograma))     o.cronograma = [];
  const ex = Array.isArray(o.statusItems) ? o.statusItems : [];
  o.statusItems = [
    ...DEFAULT_ITEMS.map(n => ex.find(x => x.id === n || x.name === n) ?? { id: n, name: n, state: null, notes: "" }),
    ...ex.filter(x => x.custom),
  ];
  return o;
}

export const encodeShare = p => {
  try {
    const clean = { ...p, photos: (p.photos ?? []).map(ph => ({ ...ph, data: "" })) };
    const bytes = new TextEncoder().encode(JSON.stringify(clean));
    return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(""));
  } catch (e) {
    console.error("encodeShare:", e);
    return null;
  }
};

export const decodeShare = h => {
  try {
    const bin = atob(h);
    const bytes = new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
};

export function readShareHash() {
  const m = (window.location.hash ?? "").match(/^#share=(.+)$/);
  if (!m) return null;
  const d = decodeShare(m[1]);
  return d ? migrate(d) : null;
}
