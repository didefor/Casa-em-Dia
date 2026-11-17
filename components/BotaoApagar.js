'use client';
// Botão de apagar com confirmação
export default function BotaoApagar({ acao, campos, texto = 'Apagar' }) {
  return (
    <form action={acao} onSubmit={(e) => { if (!confirm('Apagar mesmo? Não dá para desfazer.')) e.preventDefault(); }} style={{ display: 'inline' }}>
      {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className="mini perigo" aria-label={texto}>✕</button>
    </form>
  );
}
