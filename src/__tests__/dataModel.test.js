import { describe, it, expect } from 'vitest';
import {
  calcProgress,
  migrate,
  makeProject,
  encodeShare,
  decodeShare,
} from '../lib/dataModel.js';
import { DEFAULT_ITEMS } from '../lib/constants.js';

// ─── calcProgress ─────────────────────────────────────────────────────────────

describe('calcProgress', () => {
  it('returns 0 for empty project', () => {
    expect(calcProgress({})).toBe(0);
  });

  it('returns 0 when all items have null state', () => {
    const p = {
      statusItems:   [{ state: null }, { state: null }],
      checklist:     [],
      aperturaItems: [],
    };
    expect(calcProgress(p)).toBe(0);
  });

  it('returns 100 when all statusItems are Aprobado (only category present)', () => {
    const p = {
      statusItems:   [{ state: 'Aprobado' }, { state: 'Aprobado' }],
      checklist:     [],
      aperturaItems: [],
    };
    // weight=0.4, sole category → 1.0 * 0.4 / 0.4 = 100 %
    expect(calcProgress(p)).toBe(100);
  });

  it('returns 50 for half-done checklist (only category present)', () => {
    const p = {
      statusItems:   [],
      checklist:     [{ done: true }, { done: false }],
      aperturaItems: [],
    };
    // weight=0.3, sole category → 0.5 * 0.3 / 0.3 = 50 %
    expect(calcProgress(p)).toBe(50);
  });

  it('returns 100 when all categories are fully complete', () => {
    const p = {
      statusItems:   [{ state: 'Aprobado' }, { state: 'Aprobado' }],
      checklist:     [{ done: true }, { done: true }],
      aperturaItems: [{ state: 'OK' }, { state: 'OK' }],
    };
    expect(calcProgress(p)).toBe(100);
  });

  it('gives 60% partial credit for "En aprobación" status item', () => {
    const p = {
      statusItems:   [{ state: 'En aprobación' }],
      checklist:     [],
      aperturaItems: [],
    };
    // 0.6 * 0.4 / 0.4 = 60
    expect(calcProgress(p)).toBe(60);
  });

  it('gives 30% partial credit for "Diseñado" status item', () => {
    const p = {
      statusItems:   [{ state: 'Diseñado' }],
      checklist:     [],
      aperturaItems: [],
    };
    expect(calcProgress(p)).toBe(30);
  });

  it('mixes all three categories correctly', () => {
    // statusItems: 1 Aprobado (1.0) → v=1.0, w=0.4
    // checklist: 1 done + 1 not-done (0.5) → v=0.5, w=0.3
    // aperturaItems: all OK (1.0) → v=1.0, w=0.3
    // total = (1.0*0.4 + 0.5*0.3 + 1.0*0.3) / 1.0 = (0.4+0.15+0.3) = 0.85 → 85
    const p = {
      statusItems:   [{ state: 'Aprobado' }],
      checklist:     [{ done: true }, { done: false }],
      aperturaItems: [{ state: 'OK' }],
    };
    expect(calcProgress(p)).toBe(85);
  });
});

// ─── migrate ──────────────────────────────────────────────────────────────────

describe('migrate', () => {
  it('adds all missing array fields on a bare object', () => {
    const result = migrate({ id: 'p1', name: 'Test' });
    expect(Array.isArray(result.contacts)).toBe(true);
    expect(Array.isArray(result.checklist)).toBe(true);
    expect(Array.isArray(result.aperturaItems)).toBe(true);
    expect(Array.isArray(result.history)).toBe(true);
    expect(Array.isArray(result.photos)).toBe(true);
    expect(Array.isArray(result.visitas)).toBe(true);
    expect(Array.isArray(result.onedriveFolders)).toBe(true);
    expect(Array.isArray(result.cronograma)).toBe(true);
    expect(Array.isArray(result.mobiliario)).toBe(true);
  });

  it('sets archived=false when field is null or missing', () => {
    expect(migrate({}).archived).toBe(false);
    expect(migrate({ archived: null }).archived).toBe(false);
  });

  it('preserves archived=true', () => {
    expect(migrate({ archived: true }).archived).toBe(true);
  });

  it('sets deliveryDate="" when field is null or missing', () => {
    expect(migrate({}).deliveryDate).toBe('');
    expect(migrate({ deliveryDate: null }).deliveryDate).toBe('');
  });

  it('preserves existing deliveryDate', () => {
    expect(migrate({ deliveryDate: '2025-06-01' }).deliveryDate).toBe('2025-06-01');
  });

  it('preserves existing non-empty arrays', () => {
    const raw = {
      contacts:      [{ id: 'c1', name: 'Ana' }],
      checklist:     [{ id: 'cl1', done: false }],
      aperturaItems: [{ id: 'a1', name: 'Señalización' }],
    };
    const result = migrate(raw);
    expect(result.contacts).toHaveLength(1);
    expect(result.checklist).toHaveLength(1);
    expect(result.aperturaItems).toHaveLength(1);
  });

  it('builds statusItems from DEFAULT_ITEMS when missing', () => {
    const result = migrate({});
    expect(result.statusItems).toHaveLength(DEFAULT_ITEMS.length);
    result.statusItems.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('state');
    });
  });

  it('merges existing statusItems, preserving state', () => {
    const raw = {
      statusItems: [{ id: 'Plano general', name: 'Plano general', state: 'Aprobado', notes: '' }],
    };
    const result = migrate(raw);
    const plano = result.statusItems.find(x => x.id === 'Plano general');
    expect(plano?.state).toBe('Aprobado');
  });

  it('preserves custom statusItems', () => {
    const raw = {
      statusItems: [
        ...DEFAULT_ITEMS.map(n => ({ id: n, name: n, state: null, notes: '' })),
        { id: 'custom-1', name: 'Mi item', state: null, notes: '', custom: true },
      ],
    };
    const result = migrate(raw);
    expect(result.statusItems.some(x => x.id === 'custom-1')).toBe(true);
  });
});

// ─── makeProject ──────────────────────────────────────────────────────────────

describe('makeProject', () => {
  it('returns an object with all required top-level fields', () => {
    const p = makeProject();
    expect(typeof p.id).toBe('string');
    expect(p.id).toMatch(/^p-/);
    expect(typeof p.name).toBe('string');
    expect(typeof p.brand).toBe('string');
    expect(typeof p.status).toBe('string');
    expect(typeof p.createdAt).toBe('number');
    expect(p.createdAt).toBeGreaterThan(0);
    expect(p.archived).toBe(false);
    expect(p.deliveryDate).toBe('');
  });

  it('returns all required array fields as empty arrays', () => {
    const p = makeProject();
    expect(Array.isArray(p.contacts)).toBe(true);
    expect(Array.isArray(p.checklist)).toBe(true);
    expect(Array.isArray(p.aperturaItems)).toBe(true);
    expect(Array.isArray(p.history)).toBe(true);
    expect(Array.isArray(p.photos)).toBe(true);
    expect(Array.isArray(p.visitas)).toBe(true);
    expect(Array.isArray(p.cronograma)).toBe(true);
    expect(Array.isArray(p.mobiliario)).toBe(true);
    expect(Array.isArray(p.onedriveFolders)).toBe(true);
  });

  it('initialises statusItems from DEFAULT_ITEMS', () => {
    const p = makeProject();
    expect(p.statusItems).toHaveLength(DEFAULT_ITEMS.length);
    p.statusItems.forEach(item => {
      expect(item.state).toBeNull();
      expect(typeof item.notes).toBe('string');
    });
  });

  it('generates unique IDs for successive calls', () => {
    const ids = Array.from({ length: 5 }, () => makeProject().id);
    expect(new Set(ids).size).toBe(5);
  });
});

// ─── encodeShare / decodeShare ────────────────────────────────────────────────

describe('encodeShare / decodeShare', () => {
  const baseProject = {
    id:          'p-test-123',
    name:        'Obra de prueba',
    brand:       'olivia',
    status:      'En construcción',
    photos:      [],
    visitas:     [],
    mobiliario:  [],
    checklist:   [],
  };

  it('encodeShare returns a non-empty string', () => {
    const result = encodeShare(baseProject);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
  });

  it('decodeShare inverts encodeShare (round-trip)', () => {
    const encoded = encodeShare(baseProject);
    const decoded = decodeShare(encoded);
    expect(decoded.id).toBe(baseProject.id);
    expect(decoded.name).toBe(baseProject.name);
    expect(decoded.brand).toBe(baseProject.brand);
    expect(decoded.status).toBe(baseProject.status);
  });

  it('decodeShare returns null for empty string', () => {
    expect(decodeShare('')).toBeNull();
  });

  it('decodeShare returns null for null input', () => {
    expect(decodeShare(null)).toBeNull();
  });

  it('decodeShare returns null for invalid base64', () => {
    expect(decodeShare('not-valid-base64!!!')).toBeNull();
  });

  it('decodeShare returns null for valid base64 that is not JSON', () => {
    // "hello" base64-encoded is "aGVsbG8="
    expect(decodeShare('aGVsbG8=')).toBeNull();
  });

  it('strips base64 data from legacy photos but preserves Storage URLs', () => {
    const project = {
      ...baseProject,
      photos: [
        { id: 'ph1', data: 'data:image/jpeg;base64,BIGBASE64STRING', caption: 'old' },
        { id: 'ph2', url: 'https://supabase.co/storage/v1/object/public/bucket/file.jpg', caption: 'new' },
      ],
    };
    const decoded = decodeShare(encodeShare(project));
    // Legacy photo: data stripped to ""
    expect(decoded.photos[0].data).toBe('');
    // Storage photo: URL preserved
    expect(decoded.photos[1].url).toContain('supabase.co');
  });

  it('strips base64 data from visita photos, preserves Storage URLs', () => {
    const project = {
      ...baseProject,
      visitas: [{
        id: 'v1', date: '2024-01-01', photos: [
          { id: 'vph1', data: 'data:image/jpeg;base64,ABC', uploadedAt: 0 },
          { id: 'vph2', url: 'https://supabase.co/storage/photo.jpg', uploadedAt: 0 },
        ],
      }],
    };
    const decoded = decodeShare(encodeShare(project));
    expect(decoded.visitas[0].photos[0].data).toBe('');
    expect(decoded.visitas[0].photos[1].url).toContain('supabase.co');
  });

  it('multiple successive encodes of the same project produce the same result', () => {
    const a = encodeShare(baseProject);
    const b = encodeShare(baseProject);
    expect(a).toBe(b);
  });
});
