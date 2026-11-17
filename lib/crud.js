import { TABELAS, rotulo } from './tabelas';
import { notFound } from 'next/navigation';

export function config(tabela) {
  const cfg = TABELAS[tabela];
  if (!cfg) notFound();
  return cfg;
}

// opções das listas de seleção (campos ref:)
export async function opcoesRef(s, cfg) {
  const refs = [...new Set(cfg.campos.filter((f) => f.t.startsWith('ref:')).map((f) => f.t.slice(4)))];
  const out = {};
  await Promise.all(refs.map(async (t) => {
    const { data } = await s.from(t).select('*').order('id').limit(1000);
    out[t] = (data || []).map((r) => ({ id: r.id, r: rotulo(t, r) }));
  }));
  return out;
}

// converte o formulário em objeto para o banco
export function lerForm(cfg, fd) {
  const o = {};
  for (const f of cfg.campos) {
    if (f.t === 'bool') { if (fd.has(`__bool_${f.c}`)) o[f.c] = fd.get(f.c) === 'on'; continue; }
    if (!fd.has(f.c)) continue;
    const v = String(fd.get(f.c)).trim();
    if (v === '') { o[f.c] = null; continue; }
    if (f.t === 'number') o[f.c] = Number(v.replace(',', '.'));
    else if (f.t === 'int' || f.t.startsWith('ref:')) o[f.c] = parseInt(v, 10);
    else o[f.c] = v;
  }
  return o;
}
