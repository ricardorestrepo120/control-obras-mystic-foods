import { getBrand } from '../../lib/constants.js';
import { fx } from '../../lib/utils.js';

export default function BrandChip({ id, size = "md" }) {
  const b = getBrand(id);
  return (
    <span style={fx({ gap: 6, fontSize: { sm: 11, md: 12, lg: 13 }[size], color: "var(--tx-2)", fontWeight: 500 })}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: b.accent, flexShrink: 0 }} />
      {b.name}
    </span>
  );
}
