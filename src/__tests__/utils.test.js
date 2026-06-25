import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseLocalDate,
  daysUntil,
  fmtDate,
  fmtDateLong,
  relTime,
} from '../lib/utils.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

// Build an ISO date string offset N days from the current frozen "today"
const isoOffset = offset => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// Unix ms of the frozen "now" used in time-sensitive test blocks
const FROZEN_MS = new Date('2024-03-20T10:00:00Z').getTime();

// ─── parseLocalDate ───────────────────────────────────────────────────────────

describe('parseLocalDate', () => {
  it('parses a valid YYYY-MM-DD string', () => {
    const d = parseLocalDate('2024-06-15');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5);   // June → 0-indexed 5
    expect(d.getDate()).toBe(15);
  });

  it('returns null for empty string', () => {
    expect(parseLocalDate('')).toBeNull();
  });

  it('returns null for null / undefined', () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
  });

  it('returns null for wrong separator format (slashes) — not 3 dash-parts', () => {
    expect(parseLocalDate('2024/06/15')).toBeNull();
  });

  it('returns null for non-numeric parts', () => {
    expect(parseLocalDate('year-mo-dy')).toBeNull();
  });

  it('returns null for only 2 parts', () => {
    expect(parseLocalDate('2024-06')).toBeNull();
  });
});

// ─── daysUntil ────────────────────────────────────────────────────────────────

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_MS);
  });
  afterEach(() => vi.useRealTimers());

  it('returns positive number for a future date', () => {
    expect(daysUntil(isoOffset(7))).toBe(7);
  });

  it('returns 0 for today', () => {
    expect(daysUntil(isoOffset(0))).toBe(0);
  });

  it('returns negative number for a past date', () => {
    expect(daysUntil(isoOffset(-3))).toBe(-3);
  });

  it('returns null for empty string', () => {
    expect(daysUntil('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(daysUntil(null)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(daysUntil('not-a-date')).toBeNull();
  });
});

// ─── fmtDate ──────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  it('formats a valid date as "D MMM"', () => {
    expect(fmtDate('2024-06-15')).toBe('15 jun');
    expect(fmtDate('2024-01-01')).toBe('1 ene');
    expect(fmtDate('2024-12-31')).toBe('31 dic');
  });

  it('returns "—" for empty string', () => {
    expect(fmtDate('')).toBe('—');
  });

  it('returns "—" for null', () => {
    expect(fmtDate(null)).toBe('—');
  });

  it('returns "—" for invalid format', () => {
    expect(fmtDate('bad-date')).toBe('—');
  });
});

// ─── fmtDateLong ──────────────────────────────────────────────────────────────

describe('fmtDateLong', () => {
  it('formats a valid date as "D MMM YYYY"', () => {
    expect(fmtDateLong('2024-06-15')).toBe('15 jun 2024');
    expect(fmtDateLong('2023-03-01')).toBe('1 mar 2023');
  });

  it('returns "—" for empty string', () => {
    expect(fmtDateLong('')).toBe('—');
  });

  it('returns "—" for null', () => {
    expect(fmtDateLong(null)).toBe('—');
  });

  it('returns "—" for invalid format', () => {
    expect(fmtDateLong('2024/06/15')).toBe('—');
  });
});

// ─── relTime ──────────────────────────────────────────────────────────────────

describe('relTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_MS);
  });
  afterEach(() => vi.useRealTimers());

  it('returns "ahora" for timestamps within the last 60 seconds', () => {
    expect(relTime(FROZEN_MS)).toBe('ahora');
    expect(relTime(FROZEN_MS - 59_000)).toBe('ahora');
  });

  it('returns "hace Xm" for minutes ago', () => {
    expect(relTime(FROZEN_MS - 5 * 60_000)).toBe('hace 5m');
    expect(relTime(FROZEN_MS - 59 * 60_000)).toBe('hace 59m');
  });

  it('returns "hace Xh" for hours ago', () => {
    expect(relTime(FROZEN_MS - 2  * 3_600_000)).toBe('hace 2h');
    expect(relTime(FROZEN_MS - 23 * 3_600_000)).toBe('hace 23h');
  });

  it('returns "hace Xd" for days ago (< 30 days)', () => {
    expect(relTime(FROZEN_MS - 1 * 86_400_000)).toBe('hace 1d');
    expect(relTime(FROZEN_MS - 15 * 86_400_000)).toBe('hace 15d');
  });

  it('returns "hace X mes(es)" for > 30 days', () => {
    expect(relTime(FROZEN_MS - 31 * 86_400_000)).toBe('hace 1 mes');
    expect(relTime(FROZEN_MS - 62 * 86_400_000)).toBe('hace 2 meses');
  });
});
