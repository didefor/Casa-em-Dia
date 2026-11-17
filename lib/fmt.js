export const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const dataBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

export function mesAtual() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function hoje() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return `${mesAtual()}-${String(d.getDate()).padStart(2, '0')}`;
}
export const nomeMes = (m) => { const [a, b] = m.split('-'); return `${MESES[+b - 1]}/${a}`; };
export function somaMes(m, n) {
  const [a, b] = m.split('-').map(Number);
  const t = a * 12 + (b - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
export const difMeses = (de, ate) => {
  const [a1, b1] = de.split('-').map(Number), [a2, b2] = ate.split('-').map(Number);
  return (a2 * 12 + b2) - (a1 * 12 + b1);
};
export const noMes = (inicio, fim, m) => (!inicio || inicio <= m) && (!fim || fim >= m);
export const fimDoMes = (m) => { const [a, b] = m.split('-').map(Number); return `${m}-${String(new Date(a, b, 0).getDate()).padStart(2, '0')}`; };
