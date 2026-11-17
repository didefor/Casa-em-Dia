// Datas e meses (fuso de Brasília).

const TZ = 'America/Sao_Paulo';
const agora = () => new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
const p2 = (n) => String(n).padStart(2, '0');

export const hoje = () => { const d = agora(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
export const mesAtual = () => hoje().slice(0, 7);

export function somaMes(m, n) {
  const [a, b] = m.split('-').map(Number);
  const t = a * 12 + (b - 1) + n;
  return `${Math.floor(t / 12)}-${p2((t % 12) + 1)}`;
}
export const difMeses = (de, ate) => {
  const [a1, b1] = de.split('-').map(Number); const [a2, b2] = ate.split('-').map(Number);
  return (a2 * 12 + b2) - (a1 * 12 + b1);
};
export const noPeriodo = (inicio, fim, m) => (!inicio || inicio <= m) && (!fim || fim >= m);
export const diasNoMes = (m) => { const [a, b] = m.split('-').map(Number); return new Date(a, b, 0).getDate(); };
export const fimDoMes = (m) => `${m}-${p2(diasNoMes(m))}`;
// dia D do mês M (se o mês não tem o dia 31, usa o último)
export const dataNoMes = (m, dia) => `${m}-${p2(Math.min(Math.max(1, Number(dia) || 1), diasNoMes(m)))}`;
export const somaDias = (data, n) => {
  const [a, b, c] = data.split('-').map(Number);
  const d = new Date(Date.UTC(a, b - 1, c + n));
  return d.toISOString().slice(0, 10);
};
const ms = (d) => { const [a, b, c] = d.split('-').map(Number); return Date.UTC(a, b - 1, c); };
export const difDias = (de, ate) => Math.round((ms(ate) - ms(de)) / 864e5);
export const diaDaSemana = (data) => { const [a, b, c] = data.split('-').map(Number); return new Date(Date.UTC(a, b - 1, c)).getUTCDay(); };
export const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const brl = (v) => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
