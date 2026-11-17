// Campo de formulário a partir da descrição em lib/tabelas.js
export default function Campo({ f, valor, opcoes }) {
  const v = valor ?? f.padrao ?? '';
  const comum = { name: f.c, required: !!f.obrig };
  let input;
  if (f.t === 'bool') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx)', paddingTop: 22 }}>
        <input type="hidden" name={`__bool_${f.c}`} value="1" />
        <input type="checkbox" name={f.c} defaultChecked={valor ?? f.padrao ?? false} /> {f.l}
      </label>
    );
  }
  if (f.t === 'textarea') input = <textarea {...comum} rows={3} defaultValue={v} />;
  else if (f.t.startsWith('sel:')) input = (
    <select {...comum} defaultValue={v}><option value="">—</option>
      {f.t.slice(4).split(',').map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select>);
  else if (f.t.startsWith('ref:')) input = (
    <select {...comum} defaultValue={v ?? ''}><option value="">—</option>
      {(opcoes || []).map((o) => <option key={o.id} value={o.id}>{o.r}</option>)}</select>);
  else {
    const tipo = { number: 'number', int: 'number', date: 'date', month: 'month', color: 'color' }[f.t] || 'text';
    input = <input {...comum} type={tipo} step={f.t === 'number' ? '0.01' : f.t === 'int' ? '1' : undefined} defaultValue={f.t === 'color' ? (v || '#1f7a5a') : v} />;
  }
  return (
    <label className={f.t === 'textarea' ? 'largo' : ''}>{f.l}{f.obrig ? ' *' : ''}{input}
      {f.ajuda && <span style={{ fontSize: 12 }}>{f.ajuda}</span>}</label>
  );
}
