import { useMemo } from 'react';
import Card from '../ui/Card.jsx';
import Pill from '../ui/Pill.jsx';
import Empty from '../ui/Empty.jsx';
import { I } from '../icons/index.jsx';
import { ITEM_STATES } from '../../lib/constants.js';
import { col, fx, tc, pad2, fmtDateLong, parseLocalDate } from '../../lib/utils.js';

export default function ProjectHistory({ draft }) {
  const events = draft.history ?? [];
  const groups = useMemo(() => {
    const map = new Map();
    events.forEach(ev => { const k = new Date(ev.t).toISOString().slice(0, 10); if (!map.has(k)) map.set(k, []); map.get(k).push(ev); });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);

  const dayLabel = iso => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = parseLocalDate(iso); if (!d) return iso;
    const diff = Math.round((today - d) / 86400000);
    return diff === 0 ? "Hoy" : diff === 1 ? "Ayer" : diff < 7 ? `Hace ${diff} días` : fmtDateLong(iso);
  };

  const tkFor = s => ITEM_STATES.find(x => x.key === s)?.token;

  if (!events.length) return (
    <div className="fu">
      <Empty icon={<I.Activity size={20} />} title="Sin historial aún" hint="Los cambios de estado se registrarán automáticamente aquí." />
    </div>
  );

  return (
    <div className="fu" style={col({ gap: 14 })}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {groups.map(([day, evs], gi) => (
          <div key={day}>
            <div style={{ padding: "12px 18px", background: "var(--bg-soft)", borderTop: gi > 0 ? "1px solid var(--bd)" : "none", borderBottom: "1px solid var(--bd)", fontSize: 11, fontWeight: 600, color: "var(--tx-3)", letterSpacing: .4, textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
              <span>{dayLabel(day)}</span><span>{evs.length} evento{evs.length !== 1 ? "s" : ""}</span>
            </div>
            {evs.map((ev, i) => {
              const c = tc({ plano: "info", apertura: "ok", status: "warn" }[ev.kind]);
              const t = new Date(ev.t), isPlano = ev.kind === "plano" && ev.meta;
              return (
                <div key={ev.id} style={{ display: "flex", gap: 14, padding: "14px 18px", borderBottom: i === evs.length - 1 && gi === groups.length - 1 ? "none" : "1px solid var(--bd)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {ev.kind === "plano"    && <I.Layers   size={13} />}
                    {ev.kind === "apertura" && <I.Key      size={13} />}
                    {ev.kind === "status"   && <I.Doc      size={13} />}
                    {ev.kind === "note"     && <I.Check    size={13} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isPlano
                      ? <>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>{ev.meta.plano}</div>
                          <div style={fx({ gap: 8, flexWrap: "wrap" })}>
                            <Pill token={tkFor(ev.meta.from)} size="sm">{ev.meta.from || "Sin estado"}</Pill>
                            <I.ArrowR size={12} style={{ color: "var(--tx-3)" }} />
                            <Pill token={tkFor(ev.meta.to)} size="sm" dot>{ev.meta.to || "Sin estado"}</Pill>
                          </div>
                        </>
                      : <div style={{ fontSize: 13, color: "var(--tx)" }}>{ev.text}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--tx-3)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{pad2(t.getHours())}:{pad2(t.getMinutes())}</div>
                </div>
              );
            })}
          </div>
        ))}
      </Card>
    </div>
  );
}
