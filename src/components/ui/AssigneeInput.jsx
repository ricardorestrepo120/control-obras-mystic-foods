import { useState } from 'react';
import Input from './Input.jsx';
import Avatar from './Avatar.jsx';
import { fx } from '../../lib/utils.js';

export default function AssigneeInput({ value = "", onChange, suggestions = [], compact = false, autoFocus = false }) {
  const [open, setOpen] = useState(false);
  const hits = suggestions.filter(s => s !== value && s.toLowerCase().includes(value.toLowerCase()));
  return (
    <div style={{ position: "relative", flex: 1, minWidth: compact ? 110 : 0 }}>
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Nombre…"
        autoFocus={autoFocus}
        style={compact ? { height: 28, fontSize: 12, padding: "0 8px" } : undefined}
      />
      {open && hits.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, background: "var(--bg-elev)", border: "1px solid var(--bd)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", maxHeight: 160, overflowY: "auto" }}>
          {hits.map(s => (
            <div key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              style={fx({ padding: "8px 12px", fontSize: 12, color: "var(--tx)", cursor: "pointer", gap: 8 })}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-soft)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Avatar name={s} size={20} />{s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
