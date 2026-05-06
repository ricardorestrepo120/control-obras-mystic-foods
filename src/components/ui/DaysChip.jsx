import { daysUntil } from '../../lib/utils.js';
import Pill from './Pill.jsx';

export default function DaysChip({ date }) {
  const d = daysUntil(date);
  if (d === null) return null;
  const [token, label] = d < 0
    ? ["danger", `Hace ${Math.abs(d)}d`]
    : d === 0  ? ["warn", "Hoy"]
    : d <= 7   ? ["warn", `${d}d`]
    : d <= 30  ? ["info", `${d}d`]
    :            [null,   `${d}d`];
  return <Pill token={token} size="sm" dot>{label}</Pill>;
}
