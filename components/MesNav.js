import { nomeMes, somaMes } from '@/lib/fmt';

export default function MesNav({ m, base }) {
  return (
    <div className="mesnav">
      <a className="btn" href={`${base}?mes=${somaMes(m, -1)}`} aria-label="Mês anterior">‹</a>
      <strong style={{ minWidth: 130, textAlign: 'center' }}>{nomeMes(m)}</strong>
      <a className="btn" href={`${base}?mes=${somaMes(m, 1)}`} aria-label="Próximo mês">›</a>
    </div>
  );
}
