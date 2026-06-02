import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../ui/Card.jsx';
import Btn from '../ui/Btn.jsx';
import IconBtn from '../ui/IconBtn.jsx';
import Empty from '../ui/Empty.jsx';
import { I } from '../icons/index.jsx';
import { col, fx, fmtDate, parseLocalDate } from '../../lib/utils.js';

const ESTADOS   = ['Pendiente', 'En progreso', 'Completada'];
const MAX_DAYS  = 60;
const NAME_W    = 152; // px – name column
const STATE_W   = 112; // px – estado column
const ROW_PX    = 16;  // horizontal row padding

const ESTATE = {
  'Pendiente':   { bar: 'var(--bd-strong)', bg: 'var(--bg-soft)',   fg: 'var(--tx-3)', opacity: 0.55 },
  'En progreso': { bar: 'var(--warn)',      bg: 'var(--warn-bg)',   fg: 'var(--warn)',  opacity: 1    },
  'Completada':  { bar: 'var(--ok)',        bg: 'var(--ok-bg)',     fg: 'var(--ok)',    opacity: 1    },
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

  // Origin = earliest phase start
  const firstMs     = parseMs(sorted[0]?.fechaInicio);
  const todayOffset = firstMs !== null ? (nowMs() - firstMs) / 86400000 : null;
  const todayFrac   = todayOffset !== null ? Math.max(0, Math.min(1, todayOffset / MAX_DAYS)) : null;
  const showToday   = todayOffset !== null && todayOffset >= 0 && todayOffset <= MAX_DAYS;

  // CSS calc: x position of the today line inside the rows container
  const todayLeft = showToday
    ? `calc(${ROW_PX + NAME_W}px + ${todayFrac} * (100% - ${2 * ROW_PX + NAME_W + STATE_W}px))`
    : null;

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
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--tx-3)' }}>· escala {MAX_DAYS} días</span>
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
          <div style={{ overflowX: 'auto' }}>

            {/* Column headers */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: `6px ${ROW_PX}px`,
              background: 'var(--bg-soft)',
              borderBottom: '1px solid var(--bd)',
              minWidth: NAME_W + 280 + STATE_W,
            }}>
              <div style={{ width: NAME_W, flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: .5 }}>Fase</div>
              <DayHeader maxDays={MAX_DAYS} />
              <div style={{ width: STATE_W, flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: .5, textAlign: 'center' }}>Estado</div>
            </div>

            {/* Rows container — today line spans all rows */}
            <div style={{ position: 'relative', minWidth: NAME_W + 280 + STATE_W }}>
              {todayLeft && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: todayLeft,
                  width: 2,
                  background: 'var(--danger)',
                  zIndex: 4,
                  pointerEvents: 'none',
                }} />
              )}

              {sorted.map((fase, idx) => {
                const faseMs    = parseMs(fase.fechaInicio);
                const dias      = getDias(fase);
                const startOff  = firstMs !== null && faseMs !== null ? (faseMs - firstMs) / 86400000 : 0;
                const startFrac = Math.max(0, Math.min(1, startOff / MAX_DAYS));
                const widthFrac = Math.max(0, Math.min(dias / MAX_DAYS, 1 - startFrac));

                return (
                  <GanttRow
                    key={fase.id}
                    fase={fase}
                    dias={dias}
                    startFrac={startFrac}
                    widthFrac={widthFrac}
                    readOnly={readOnly}
                    isLast={idx === sorted.length - 1}
                    onPatch={ch => patch(fase.id, ch)}
                    onRemove={() => remove(fase.id)}
                  />
                );
              })}
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

// ── DayHeader ──────────────────────────────────────────────────────────────
// Renders day numbers 1-60 with density adapted to the available bar width.
// Uses a ResizeObserver so the label step recalculates on every resize.
function DayHeader({ maxDays }) {
  const ref = useRef(null);
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBarW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Minimum pixels between label centers before we start skipping
  const LABEL_MIN_PX = 13;
  const pxPerDay = barW > 0 ? barW / maxDays : 0;
  let step = 1;
  if (pxPerDay > 0 && pxPerDay < LABEL_MIN_PX) {
    step = Math.ceil(LABEL_MIN_PX / pxPerDay);
    // Round up to a "clean" interval so labels fall on round numbers
    if (step <= 2)  step = 2;
    else if (step <= 5)  step = 5;
    else if (step <= 10) step = 10;
    else step = 15;
  }

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative', height: 18 }}>
      {Array.from({ length: maxDays }, (_, i) => {
        const d = i + 1;
        if (d !== maxDays && d % step !== 0) return null;
        return (
          <div key={d} style={{
            position: 'absolute',
            left: `${d / maxDays * 100}%`,
            top: 3,
            transform: d === maxDays ? 'translateX(-100%)' : 'translateX(-50%)',
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--tx-4)',
            userSelect: 'none',
            lineHeight: 1,
            letterSpacing: 0,
          }}>
            {d}
          </div>
        );
      })}
    </div>
  );
}

function GanttRow({ fase, dias, startFrac, widthFrac, readOnly, isLast, onPatch, onRemove }) {
  const [editName, setEditName] = useState(false);
  const st = ESTATE[fase.estado] ?? ESTATE['Pendiente'];

  const cycleEstado = () => {
    const idx = ESTADOS.indexOf(fase.estado);
    onPatch({ estado: ESTADOS[(idx + 1) % ESTADOS.length] });
  };

  const fechaFin = fase.fechaInicio ? fmtDate(addDays(fase.fechaInicio, dias)) : '—';

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: `11px ${ROW_PX}px`,
      borderBottom: isLast ? 'none' : '1px solid var(--bd)',
    }}>

      {/* ── Nombre + fechas ── */}
      <div style={{ width: NAME_W, flexShrink: 0, paddingRight: 12, minWidth: 0, overflow: 'hidden' }}>
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
            title={!readOnly ? 'Clic para editar' : undefined}
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

      {/* ── Barra ── */}
      <div style={{ flex: 1, position: 'relative', height: 26, background: 'var(--bg-soft)', borderRadius: 6 }}>
        {/* Day separator lines — every day, 5-day marks slightly more prominent */}
        {Array.from({ length: MAX_DAYS - 1 }, (_, i) => i + 1).map(d => (
          <div key={d} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${d / MAX_DAYS * 100}%`,
            width: 1,
            background: 'var(--bd)',
            opacity: d % 5 === 0 ? 0.55 : 0.18,
          }} />
        ))}
        {/* Bar */}
        {widthFrac > 0 && (
          <div style={{
            position: 'absolute',
            top: 4, bottom: 4,
            left: `${startFrac * 100}%`,
            width: `${widthFrac * 100}%`,
            background: st.bar,
            borderRadius: 4,
            minWidth: 4,
            opacity: st.opacity,
          }} />
        )}
      </div>

      {/* ── Estado + eliminar ── */}
      <div style={{ width: STATE_W, flexShrink: 0, paddingLeft: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
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
