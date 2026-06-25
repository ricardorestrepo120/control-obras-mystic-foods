import { useState, useMemo } from 'react';
import Card from '../ui/Card.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Empty from '../ui/Empty.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, fmtDate, parseLocalDate, MONTHS } from '../../lib/utils.js';

const ESTADOS  = ['Pendiente', 'En progreso', 'Completada'];
const MAX_DAYS = 60;
const DAY_W    = 30;                // px per day column
const BAR_W    = MAX_DAYS * DAY_W; // 1800 px total scrollable area
const NAME_W   = 210;              // px — sticky left column
const STATE_W  = 108;              // px — sticky right column

const ESTATE = {
  'Pendiente':   { bar: 'var(--bd-strong)', bg: 'var(--bg-soft)',  fg: 'var(--tx-3)', opacity: 0.55 },
  'En progreso': { bar: 'var(--warn)',      bg: 'var(--warn-bg)',  fg: 'var(--warn)',  opacity: 1    },
  'Completada':  { bar: 'var(--ok)',        bg: 'var(--ok-bg)',    fg: 'var(--ok)',    opacity: 1    },
};

const parseMs = s => {
  if (!s) return null;
  const d = parseLocalDate(s);
  return d ? d.getTime() : null;
};

const nowMs = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); };

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const addDays = (isoDate, n) => {
  const ms = parseMs(isoDate);
  if (!ms) return isoToday();
  const d = new Date(ms + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDias = f => {
  if (f.dias != null && !isNaN(Number(f.dias))) return Math.max(1, Math.min(MAX_DAYS, Number(f.dias)));
  if (f.fechaInicio && f.fechaFin) {
    const a = parseMs(f.fechaInicio), b = parseMs(f.fechaFin);
    if (a !== null && b !== null) return Math.max(1, Math.round((b - a) / 86400000));
  }
  return 7;
};

export default function ProjectCronograma({ draft, setDraft, readOnly = false }) {
  const cronograma = draft.cronograma ?? [];

  const sorted = useMemo(
    () => [...cronograma].sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || '')),
    [cronograma],
  );

  const completadas = cronograma.filter(f => f.estado === 'Completada').length;
  const totalDias   = cronograma.reduce((s, f) => s + getDias(f), 0);
  const progreso    = cronograma.length > 0 ? Math.round(completadas / cronograma.length * 100) : 0;

  const firstMs     = parseMs(sorted[0]?.fechaInicio);
  const originIso   = sorted[0]?.fechaInicio ?? null;
  const todayOffset = firstMs !== null ? (nowMs() - firstMs) / 86400000 : null;
  const showToday   = todayOffset !== null && todayOffset >= 0 && todayOffset <= MAX_DAYS;
  // Today line is offset from the left edge of the rows container, which includes the sticky name column
  const todayPx     = showToday ? NAME_W + todayOffset * DAY_W : null;

  const patch  = (id, ch) => setDraft(d => ({ ...d, cronograma: (d.cronograma ?? []).map(f => f.id === id ? { ...f, ...ch } : f) }));
  const remove = id       => setDraft(d => ({ ...d, cronograma: (d.cronograma ?? []).filter(f => f.id !== id) }));

  const addFase = () => {
    const start = sorted.length > 0
      ? addDays(sorted[sorted.length - 1].fechaInicio, getDias(sorted[sorted.length - 1]))
      : isoToday();
    setDraft(d => ({
      ...d,
      cronograma: [...(d.cronograma ?? []), {
        id: `f-${crypto.randomUUID()}`,
        nombre: 'Nueva fase',
        fechaInicio: start,
        dias: 7,
        estado: 'Pendiente',
        createdAt: Date.now(),
      }],
    }));
  };

  return (
    <div className="fu" style={col({ gap: 14 })}>

      {/* ── Resumen ── */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(88px,1fr))', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Total fases',  value: cronograma.length },
            { label: 'Completadas',  value: completadas },
            { label: 'Días totales', value: totalDias },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '10px 14px', borderLeft: '3px solid var(--bd)' }}>
              <div style={{ fontSize: 11, color: 'var(--tx-3)', fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)', letterSpacing: -.5, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={fx({ gap: 10 })}>
          <div style={{ flex: 1, height: 8, background: 'var(--bd)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progreso}%`, background: progreso === 100 ? 'var(--ok)' : 'var(--accent)', borderRadius: 999, transition: 'width .3s ease' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', minWidth: 32, textAlign: 'right' }}>{progreso}%</span>
        </div>
        <div style={{ marginTop: 5, fontSize: 11, color: 'var(--tx-3)' }}>
          {completadas} de {cronograma.length} {cronograma.length === 1 ? 'fase completada' : 'fases completadas'}
        </div>
      </Card>

      {/* ── Gantt ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={fx({ justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--bd)' })}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
            Diagrama de Gantt{' '}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--tx-3)' }}>· {MAX_DAYS} días · {DAY_W}px/día</span>
          </div>
          {!readOnly && (
            <Btn size="sm" variant="soft" icon={<I.Plus size={13} />} onClick={addFase}>Nueva fase</Btn>
          )}
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: '0 16px 20px' }}>
            <Empty icon={<I.Calendar size={20} />} title="Sin fases" hint="Agrega las fases del cronograma" />
          </div>
        ) : (
          /* Scroll container — only the bar area scrolls; name and estado columns are sticky */
          <div style={{ overflowX: 'auto' }}>
            {/* Wide wrapper sets the total scrollable width */}
            <div style={{ width: NAME_W + BAR_W + STATE_W }}>

              {/* ── HEADER ROW ── */}
              <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--bg-soft)', borderBottom: '1px solid var(--bd)', height: 40 }}>

                {/* Sticky left: column label */}
                <div style={{
                  position: 'sticky', left: 0, zIndex: 4,
                  width: NAME_W, flexShrink: 0,
                  background: 'var(--bg-soft)',
                  boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', paddingLeft: 16,
                  fontSize: 10, fontWeight: 600, color: 'var(--tx-3)',
                  textTransform: 'uppercase', letterSpacing: .5,
                }}>Fase</div>

                {/* Day date headers */}
                <DayHeader originIso={originIso} maxDays={MAX_DAYS} />

                {/* Sticky right: column label */}
                <div style={{
                  position: 'sticky', right: 0, zIndex: 4,
                  width: STATE_W, flexShrink: 0,
                  background: 'var(--bg-soft)',
                  boxShadow: '-2px 0 8px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600, color: 'var(--tx-3)',
                  textTransform: 'uppercase', letterSpacing: .5,
                }}>Estado</div>
              </div>

              {/* ── ROWS + TODAY LINE ── */}
              <div style={{ position: 'relative' }}>
                {todayPx !== null && (
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: todayPx, width: 2,
                    background: 'var(--danger)', zIndex: 2, pointerEvents: 'none',
                  }} />
                )}
                {sorted.map((fase, idx) => {
                  const faseMs   = parseMs(fase.fechaInicio);
                  const dias     = getDias(fase);
                  const startOff = firstMs !== null && faseMs !== null ? (faseMs - firstMs) / 86400000 : 0;
                  const startPx  = Math.max(0, startOff * DAY_W);
                  const widthPx  = Math.min(dias * DAY_W, BAR_W - startPx);
                  return (
                    <GanttRow
                      key={fase.id}
                      fase={fase} dias={dias}
                      startPx={startPx} widthPx={widthPx}
                      readOnly={readOnly}
                      isLast={idx === sorted.length - 1}
                      onPatch={ch => patch(fase.id, ch)}
                      onRemove={() => remove(fase.id)}
                    />
                  );
                })}
              </div>

            </div>
          </div>
        )}
      </Card>

      {/* ── Leyenda ── */}
      <div style={fx({ gap: 18, flexWrap: 'wrap', padding: '0 2px' })}>
        {ESTADOS.map(e => (
          <div key={e} style={fx({ gap: 6 })}>
            <div style={{ width: 14, height: 10, borderRadius: 3, background: ESTATE[e].bar, opacity: ESTATE[e].opacity, flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--tx-2)' }}>{e}</span>
          </div>
        ))}
        <div style={fx({ gap: 6 })}>
          <div style={{ width: 2, height: 12, background: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--tx-2)' }}>Hoy</span>
        </div>
      </div>

    </div>
  );
}

// ── DayHeader ─────────────────────────────────────────────────────────────
// Each cell is DAY_W px wide and shows the real calendar date derived
// from the origin (first phase's fechaInicio).
// • Day number is always shown.
// • Month abbreviation appears on the first cell and whenever the month changes.
// • The border between months is slightly stronger.
function DayHeader({ originIso, maxDays }) {
  return (
    <div style={{ display: 'flex', width: maxDays * DAY_W, flexShrink: 0, height: '100%' }}>
      {Array.from({ length: maxDays }, (_, i) => {
        const isoDay     = originIso ? addDays(originIso, i) : null;
        const d          = isoDay ? parseLocalDate(isoDay) : null;
        const dayNum     = d ? d.getDate() : i + 1;
        const isNewMonth = d !== null && d.getDate() === 1 && i > 0;
        const showMonth  = i === 0 || isNewMonth;
        return (
          <div key={i} style={{
            width: DAY_W, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 1,
            borderLeft: `1px solid ${isNewMonth ? 'var(--bd-strong)' : 'var(--bd)'}`,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: isNewMonth ? 'var(--tx-2)' : 'var(--tx-3)',
              lineHeight: 1, userSelect: 'none',
            }}>
              {dayNum}
            </span>
            {showMonth && d && (
              <span style={{ fontSize: 9, color: 'var(--tx-4)', lineHeight: 1, userSelect: 'none' }}>
                {MONTHS[d.getMonth()]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── GanttRow ──────────────────────────────────────────────────────────────
function GanttRow({ fase, dias, startPx, widthPx, readOnly, isLast, onPatch, onRemove }) {
  const [editName, setEditName] = useState(false);
  const st    = ESTATE[fase.estado] ?? ESTATE['Pendiente'];
  const rowBg = 'var(--bg-elev)';

  const cycleEstado = () => {
    const idx = ESTADOS.indexOf(fase.estado);
    onPatch({ estado: ESTADOS[(idx + 1) % ESTADOS.length] });
  };

  const fechaFin = fase.fechaInicio ? fmtDate(addDays(fase.fechaInicio, dias)) : '—';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: isLast ? 'none' : '1px solid var(--bd)' }}>

      {/* ── Sticky left: phase name + date controls ── */}
      <div style={{
        position: 'sticky', left: 0, zIndex: 3,
        width: NAME_W, flexShrink: 0,
        background: rowBg,
        boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        padding: '10px 12px 10px 16px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        {editName && !readOnly ? (
          <input
            value={fase.nombre}
            onChange={e => onPatch({ nombre: e.target.value })}
            onBlur={() => setEditName(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditName(false); }}
            autoFocus
            style={{
              width: '100%', fontSize: 13, fontWeight: 600,
              border: 'none', borderBottom: '1.5px solid var(--accent)',
              background: 'transparent', color: 'var(--tx)', outline: 'none',
              padding: '1px 0', marginBottom: 5,
            }}
          />
        ) : (
          <div
            onClick={() => !readOnly && setEditName(true)}
            title={fase.nombre || '—'}
            style={{
              fontSize: 13, fontWeight: 600, color: 'var(--tx)',
              cursor: readOnly ? 'default' : 'text',
              marginBottom: 5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {fase.nombre || '—'}
          </div>
        )}

        {readOnly ? (
          <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>
            {fase.fechaInicio ? fmtDate(fase.fechaInicio) : '—'} → {fechaFin} · {dias}d
          </div>
        ) : (
          <div style={fx({ gap: 4 })}>
            <input
              type="date"
              value={fase.fechaInicio || ''}
              onChange={e => onPatch({ fechaInicio: e.target.value })}
              style={{
                fontSize: 10, border: '1px solid var(--bd)', borderRadius: 4,
                background: 'var(--bg-elev)', color: 'var(--tx-2)',
                padding: '2px 3px', outline: 'none', width: 88, cursor: 'pointer',
              }}
            />
            <input
              type="number"
              value={dias}
              min={1} max={MAX_DAYS}
              onChange={e => onPatch({ dias: Math.max(1, Math.min(MAX_DAYS, Number(e.target.value) || 1)) })}
              style={{
                fontSize: 10, border: '1px solid var(--bd)', borderRadius: 4,
                background: 'var(--bg-elev)', color: 'var(--tx-2)',
                padding: '2px 3px', outline: 'none', width: 34, textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--tx-3)', lineHeight: '20px' }}>d</span>
          </div>
        )}
      </div>

      {/* ── Bar area (scrolls) ── */}
      <div style={{ width: BAR_W, flexShrink: 0, position: 'relative', background: 'var(--bg-soft)', alignSelf: 'stretch' }}>
        {/* Day separator lines — 5-day marks slightly more prominent */}
        {Array.from({ length: MAX_DAYS - 1 }, (_, i) => i + 1).map(d => (
          <div key={d} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: d * DAY_W, width: 1,
            background: 'var(--bd)',
            opacity: d % 5 === 0 ? 0.55 : 0.18,
          }} />
        ))}
        {/* Bar */}
        {widthPx > 0 && (
          <div style={{
            position: 'absolute',
            top: 8, bottom: 8,
            left: startPx, width: widthPx,
            background: st.bar, borderRadius: 4, minWidth: 4, opacity: st.opacity,
          }} />
        )}
      </div>

      {/* ── Sticky right: estado button + delete ── */}
      <div style={{
        position: 'sticky', right: 0, zIndex: 3,
        width: STATE_W, flexShrink: 0,
        background: rowBg,
        boxShadow: '-2px 0 8px rgba(0,0,0,0.06)',
        padding: '0 10px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <button
          onClick={!readOnly ? cycleEstado : undefined}
          title={!readOnly ? 'Clic para cambiar estado' : undefined}
          style={{
            flex: 1, padding: '4px 6px', borderRadius: 999, border: 'none',
            background: st.bg, color: st.fg,
            fontSize: 11, fontWeight: 600, textAlign: 'center',
            cursor: readOnly ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {fase.estado}
        </button>
        {!readOnly && (
          <IconBtn icon={<I.Trash size={12} />} onClick={onRemove} title="Eliminar fase" danger />
        )}
      </div>

    </div>
  );
}
