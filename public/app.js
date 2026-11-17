/* Casa em Dia — interface (JavaScript puro, sem build).
 * Para criar uma tela nova: acrescente um item em PAGES (fim do arquivo).
 * Para um cadastro novo: acrescente um formulário em FORMS. */

// ---------- utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => nf.format(Number(v) || 0);
const money = (v) => `R$ ${fmt(v)}`;
const big = (v, size = 'lg') => {
  const [int, cents] = fmt(Math.abs(v)).split(',');
  return `<div class="big ${size} ${v < 0 ? 'neg' : ''}"><span class="cur">${v < 0 ? '−' : ''}R$</span><span>${int}</span><span class="cents">,${cents}</span></div>`;
};
const pad2 = (n) => String(n).padStart(2, '0');
const pct = (v) => `${Math.round(v)}%`;
const curMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (m, n) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthName = (m) => MESES[Number(m.split('-')[1]) - 1];
const monthShort = (m) => `${MES_CURTO[Number(m.split('-')[1]) - 1]} ${m.slice(2, 4)}`;
const initials = (n) => String(n || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const avatar = (p, size = '') => (p?.photo
  ? `<span class="avatar ${size}" style="background:${esc(p?.color || '#94a3b8')}"><img src="${p.photo}" alt=""></span>`
  : `<span class="avatar ${size}" style="background:${esc(p?.color || '#94a3b8')}">${esc(size ? initials(p?.name) : initials(p?.name).slice(0, 1))}</span>`);
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sem storage */ } },
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

// Cache das leituras: ao trocar de aba, a tela aparece na hora com o que já foi carregado
// e é atualizada logo em seguida com os dados novos (qualquer gravação limpa o cache).
const GETC = new Map();
async function api(path, opts = {}) {
  const isGet = !opts.method || opts.method === 'GET';
  if (isGet && apiFromCache && GETC.has(path)) return GETC.get(path);
  const res = await fetch(`/api/${path}`, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== 'login') { showLogin(); throw new Error('login'); }
  if (res.status === 403 && path !== 'login') toast(data.error || 'Seu acesso não permite fazer isso');
  if (!res.ok) throw new Error(data.error || 'Erro');
  if (isGet) GETC.set(path, data); else GETC.clear();
  return data;
}
let apiFromCache = false;
let loadTimer = null;
const loading = (on) => {
  clearTimeout(loadTimer);
  if (on) loadTimer = setTimeout(() => document.body.classList.add('is-loading'), 120);
  else document.body.classList.remove('is-loading');
};

const ICONS = {
  grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  cash: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
  subs: '<rect x="3.5" y="5" width="17" height="12" rx="2.5"/><path d="M10.5 8.8v4.4l3.8-2.2z"/><path d="M8 20h8"/>',
  swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"/><path d="M12 17.2v.1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3"/><path d="M16 7l3 3"/><path d="M14 9l2 2"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.6 0-1.3-1-1.4-1-2.6 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  spark: '<path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  chat: '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>',
  cart: '<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7"/><circle cx="9.5" cy="18.5" r="1.4"/><circle cx="17" cy="18.5" r="1.4"/>',
  gauge: '<path d="M4.5 16a8 8 0 1 1 15 0"/><path d="M12 13l4-5"/><circle cx="12" cy="14" r="1.4"/><path d="M6 20h12"/>',
  plug: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
  bankacc: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/><circle cx="17" cy="15" r="1.2"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
  loan: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  piggy: '<path d="M5 11a7 6 0 0 1 13-2h2v4l-2 1-1 4h-3v-2h-4v2H7l-1-3a6 6 0 0 1-1-4z"/><circle cx="15" cy="11" r=".6"/>',
  tool: '<path d="M14 6l4 4-9 9H5v-4z"/><path d="M13 7l4 4"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h2"/><path d="M3 9h18"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

// Ícones low poly do app (public/img). Para trocar um ícone, troque o arquivo ou o caminho aqui.
const ICON_IMG = {
  renda: 'img/saco-dinheiro.webp',
  pagar: 'img/recibo.webp',
  casa: 'img/balanca.webp',
  poupanca: 'img/porquinho.webp',
  diaadia: 'img/carrinho.webp',
  acerto: 'img/maos-acerto.webp',
  carteira: 'img/carteira.webp',
  cartoes: 'img/cartao-credito.webp',
  moradia: 'img/casa.webp',
  emprestimos: 'img/banco.webp',
  banco: 'img/banco.webp',
  projetos: 'img/obra.webp',
  alvo: 'img/alvo.webp',
  relogio: 'img/relogio.webp',
  aviao: 'img/aviao.webp',
  boia: 'img/boia.webp',
  carro: 'img/carro.webp',
  formatura: 'img/formatura.webp',
  casinha: 'img/casa.webp',
  porquinho: 'img/porquinho.webp',
  dinheiro: 'img/saco-dinheiro.webp',
};
// Ícones que ainda não existem usam um emoji no lugar.
const ICON_FALLBACK = {};
// Ícones para escolher nas caixinhas (emojis antigos viram o ícone equivalente).
const SV_ICONS = [['porquinho', 'Porquinho'], ['boia', 'Boia (reserva)'], ['aviao', 'Avião (viagem)'], ['carro', 'Carro'], ['casinha', 'Casa'], ['formatura', 'Formatura (estudos)'], ['alvo', 'Alvo (meta)'], ['dinheiro', 'Saco de dinheiro']];
const EMOJI_TO_ICON = { '🐷': 'porquinho', '🛟': 'boia', '✈️': 'aviao', '🚗': 'carro', '🏠': 'casinha', '🎓': 'formatura', '🎯': 'alvo', '💰': 'dinheiro' };
const svIcon = (sv, cls = 'sv-ic') => {
  const k = ICON_IMG[sv?.icon] ? sv.icon : EMOJI_TO_ICON[sv?.icon];
  return k ? illus(k, cls) : `<span class="${cls} emoji-ic">${esc(sv?.icon || '🐷')}</span>`;
};
const illus = (k, cls = 'illus') => (ICON_IMG[k]
  ? `<img class="${cls}" src="${ICON_IMG[k]}" alt="" loading="lazy" decoding="async">`
  : `<span class="${cls} emoji-ic">${ICON_FALLBACK[k] || '•'}</span>`);

// Mascote (a casinha do logo) com a cara do saldo previsto: feliz, preocupada ou triste.
function moodOf(b) {
  if (b.leftover < 0) return 'triste';
  if (b.income > 0 && b.leftover_pct < 10) return 'preocupado';
  return 'feliz';
}
const MOOD_TXT = { feliz: 'Saldo tranquilo', preocupado: 'Saldo apertado: menos de 10% da renda livre', triste: 'Saldo no vermelho' };
function mascot(mood, cls = 'mascot') {
  const eye = (cx, color) => `<g class="eye"><circle cx="${cx}" cy="36" r="4.4" fill="${color}"/><circle cx="${cx + 1.4}" cy="34.6" r="1.3" fill="#fff"/></g>`;
  const face = {
    feliz: `<path d="M27 42.5q5 5 10 0" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
      <circle cx="21.5" cy="41.5" r="2" fill="#f43f5e" opacity=".25"/><circle cx="42.5" cy="41.5" r="2" fill="#f43f5e" opacity=".25"/>`,
    preocupado: `<path d="M22.5 30.6l5-1.4M41.5 30.6l-5-1.4" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M27.5 44.5q1.6-1.6 3.2 0t3.2 0t3.2 0" fill="none" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
      <path class="drop" d="M45.5 27.5q2 3 0 4.4q-2-1.4 0-4.4z" fill="#38bdf8"/>`,
    triste: `<path d="M22.5 30.6l5-2.6M41.5 30.6l-5-2.6" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M21 31.5h10v4.2h-10zM33 31.5h10v4.2h-10z" fill="#fff"/><path d="M21.6 35.6h9M33.4 35.6h9" stroke="#1e293b" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>
      <path d="M27.5 45.5q4.5-4 9 0" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>
      <path class="tear" d="M24.5 40q1.6 2.6 0 3.6q-1.6-1 0-3.6z" fill="#38bdf8"/>`,
  }[mood];
  return `<svg class="${cls} mood-${mood}" viewBox="0 0 64 64" role="img" aria-label="${MOOD_TXT[mood]}"><title>${MOOD_TXT[mood]}</title>
    <rect width="64" height="64" rx="14" fill="${mood === 'triste' ? '#64748b' : mood === 'preocupado' ? '#f59e0b' : '#2563eb'}"/>
    <path d="M12 31l20-16.5 20 16.5v18.5H12z" fill="#fff"/>${eye(26, '#2563eb')}${eye(38, '#f43f5e')}${face}</svg>`;
}

// Ícones de interface (SVG, mesmo traço do menu). Use ${I.nome} nos templates.
const I = {
  check: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  alert: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4"/><path d="M12 17.2v.1"/></svg>',
  camera: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  up: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>',
  down: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>',
  download: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  upload: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V9"/><path d="M7 14l5-5 5 5"/><path d="M5 4h14"/></svg>',
  spark: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9z"/></svg>',
  chevD: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>',
  chevL: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  chevR: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  power: '<svg class="gi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/></svg>',
};

// ---------- ajuda: ícone "?" com explicação ----------
const HELP = {
  despensa: 'Cadastre os produtos e a quantidade mínima de cada um. Ao registrar as compras (com o valor), o app aprende quanto a casa consome por mês, avisa o que está acabando, monta a lista de compras e compara preços. “Acabando” = chegou no mínimo, ou sobra menos de uma semana do consumo normal.',
  servidor: 'Um banco de dados destes costuma ocupar poucos MB por pessoa, então o que enche o disco são os backups guardados e outros apps do servidor. Você recebe um aviso no sininho quando o disco passar de 85%.',
  verpainel: 'Troca de quem é o painel: o seu, o da outra pessoa da casa (como ela vê) ou o do casal, que soma a renda, as contas, os saldos e a sobra dos dois. Vale para todas as telas até você trocar de novo. Não muda o acesso de ninguém.',
  openfinance: 'Com o Open Finance, o banco libera (com a sua autorização) a leitura das movimentações. O app busca tudo 1× por dia e cria os lançamentos: compras do cartão na fatura certa, Pix/débitos na conta, recebimentos que batem com suas receitas viram “Recebi”, contas fixas com o mesmo valor ficam pagas. O que você já tinha lançado não duplica. Pagamento de fatura e transferência entre suas contas não contam como gasto.',
  receitas: 'Cadastre cada entrada que se repete: contrato (com prazo), salário, benefício ou freela. O app prevê quanto deve cair em cada mês e em qual conta (isso entra no saldo previsto). Quando cair, toque em “Recebi”: cria a entrada na conta e marca o mês. Pagou em partes? O mês fica “parcial” até completar.',
  receber: 'Entradas previstas no mês (contratos, salário cadastrado em Receitas, benefícios). ✓ recebido · ◐ parcial · ○ previsto · ⚠ atrasado. Toque no nome para registrar que caiu.',
  assinaturas: 'Cadastre cada assinatura uma vez. Paga no cartão: a cobrança entra sozinha na fatura do mês certo (mensal, a cada 3 ou 6 meses, ou anual). Pix, débito, boleto ou dinheiro: aparece em Contas a pagar no dia, para marcar como pago. Cancelou? Desmarque “Ativa” ou informe o mês em que termina.',
  espaco: 'Conta separada: a pessoa tem os próprios cartões, contas e lançamentos, e ninguém mais vê (nem o administrador pelo app). Dados principais: vê e mexe nos mesmos dados que você.',
  saldo: 'Quanto deve sobrar do seu dinheiro no fim do mês depois de pagar sua parte da casa, suas contas pessoais, o que vai guardar e o dia a dia. É uma previsão: muda conforme você lança. A casinha mostra o humor: feliz (tranquilo), preocupada (menos de 10% da renda sobrando) ou triste (no vermelho).',
  pagar: 'Tudo que sai do seu bolso neste mês: contas fixas, faturas, parcelas, pagamentos recorrentes e depósitos da poupança. Marque o círculo quando pagar. Toque no nome para pagar outro valor, ajustar só este mês ou pular.',
  diaadia: 'Gastos do cotidiano lançados no mês (mercado, lanche, farmácia…), comparados com o orçamento do dia a dia que você define em Nossa renda.',
  acerto: 'Quem pagou mais contas da casa do que a própria parte recebe a diferença de volta. Marque “feito” quando o Pix for feito.',
  contas: 'Soma do saldo de hoje das suas contas bancárias cadastradas.',
  livre: 'Quanto você pode gastar por dia até o fim do mês sem a conta ficar no vermelho, já contando o que ainda vai entrar e sair.',
  fimmes: 'Saldo previsto das suas contas no último dia do mês: saldo de hoje + o que ainda vai entrar (salário) − o que ainda vai sair (contas, faturas, parcelas, pagamentos).',
  media: 'Média do que entrou (+) e saiu (−) das suas contas por dia neste mês.',
  credito: 'Limite que ainda está livre somando todos os seus cartões. Compras parceladas ocupam o limite até a última parcela; fatura paga libera o limite.',
  divida: 'Tudo que ainda falta pagar: saldo dos empréstimos + faturas e parcelas futuras dos cartões.',
  casa: 'Contas da casa divididas entre vocês, proporcional ao salário de cada um (ou meio a meio, em Nossa renda). A bolinha colorida mostra quem paga cada conta.',
  cartoes: 'Fatura do mês do cartão escolhido, limite livre e próximas faturas. “Fechada” = já passou o dia de fechamento; “Paga” = você marcou como paga.',
  moradia: 'Quanto da renda vai para morar (aluguel, financiamento, condomínio, luz…). O recomendado é até 30%. Marque as contas como “moradia” no cadastro.',
  emprestimos: 'Saldo devedor = parcelas que faltam × valor da parcela. Ao antecipar, o banco abate parcelas do fim e você economiza juros.',
  poupanca: 'Dinheiro guardado em caixinhas (reserva, viagem…). Cada uma pode ter meta e valor por mês; o depósito do mês aparece em Contas a pagar.',
  patrimonio: 'Tudo que vocês têm menos o que devem: bens (valor de mercado) + saldo das contas + poupança − dívidas.',
  projetos: 'Obras e projetos com o valor estimado do mês. Ligue gastos e pagamentos ao bem (ex.: a casa) para acompanhar o custo total.',
  avisos: 'Mostra se alguma conta vai ficar negativa antes de um débito, para você depositar a tempo.',
  japago: 'Tudo que já saiu do bolso para este item: lançamentos e parcelas vinculados (e, nos bens, o “já pago antes” do cadastro).',
  faltapagar: 'Parcelas que ainda faltam de financiamentos, contas com data de fim e compras no cartão ligadas a este bem.',
  liquido: 'Valor de mercado menos o que falta pagar: quanto do bem já é realmente seu.',
  gastomedio: 'Média mensal de gastos com o bem nos últimos 12 meses.',
  lembretes: 'Pagamentos que se repetem (ex.: pedreiro toda sexta). Cada vez entra em Contas a pagar e você recebe um aviso no dia e na hora marcada.',
  devedor: 'Quanto ainda falta pagar do empréstimo: parcelas restantes × valor da parcela.',
};
const help = (k) => (HELP[k] ? `<button type="button" class="help" data-help="${k}" aria-label="O que é isso?">?</button>` : '');

// Balão de ajuda: passa o mouse (ou toca) no "?".
function helpTip() {
  let tip = $('#helpTip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'helpTip'; tip.className = 'help-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip); }
  return tip;
}
function showHelp(btn) {
  const tip = helpTip();
  tip.textContent = HELP[btn.dataset.help] || '';
  tip.hidden = false;
  const r = btn.getBoundingClientRect();
  const w = Math.min(300, innerWidth - 24);
  tip.style.width = `${w}px`;
  const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
  const below = r.bottom + 8 + tip.offsetHeight < innerHeight;
  tip.style.left = `${left}px`;
  tip.style.top = `${below ? r.bottom + 8 : r.top - tip.offsetHeight - 8}px`;
  tip.dataset.for = btn.dataset.help;
  state.helpBtn = btn;
}
const hideHelp = () => { const t = $('#helpTip'); if (t) t.hidden = true; state.helpBtn = null; };
document.addEventListener('mouseover', (e) => { const b = e.target.closest?.('.help'); if (b && matchMedia('(hover: hover)').matches) showHelp(b); });
document.addEventListener('mouseout', (e) => { if (e.target.closest?.('.help')) hideHelp(); });
document.addEventListener('focusin', (e) => { const b = e.target.closest?.('.help'); if (b) showHelp(b); });
document.addEventListener('focusout', (e) => { if (e.target.closest?.('.help')) hideHelp(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('.help');
  if (!b) { if (state.helpBtn) hideHelp(); return; }
  e.preventDefault(); e.stopPropagation();
  if (state.helpBtn === b) hideHelp(); else showHelp(b);
}, true);
addEventListener('scroll', () => { if (state.helpBtn) hideHelp(); }, { passive: true, capture: true });

// ---------- tour guiado ----------
const TOUR = [
  { page: 'visao', title: 'Bem-vindo ao Casa em Dia', text: 'Vou te mostrar em 2 minutos como usar. Você pode sair a qualquer hora e refazer o tour em Configurações → Como usar.' },
  { page: 'bancarias', sel: ['.page-head [data-form="account"]', '[data-form="account"]'], title: '1. Cadastre sua conta bancária', text: 'Comece pela conta onde cai seu salário (ex.: Sicredi). Informe o saldo de hoje e o dia do salário: ele entra sozinho todo mês.' },
  { page: 'cartoes', sel: ['[data-form="card"]'], title: '2. Cadastre seus cartões', text: 'Digite o banco e a cor vem sozinha. Coloque limite, fechamento e vencimento. Se a fatura é em débito automático, vincule à conta bancária.' },
  { page: 'contas', sel: ['.page-head [data-form="bill"]'], title: '3. Contas fixas', text: 'Aluguel, luz, internet, academia… tudo que se repete todo mês. Contas “da casa” são divididas entre o casal.' },
  { page: 'visao', sel: ['#addBtn', '#tabAdd'], title: '4. Lance receitas e despesas', text: 'Pelo “+ Adicionar” você lança gastos do dia a dia, entradas extras, compras no cartão (parceladas), guarda dinheiro e muito mais.' },
  { page: 'visao', sel: ['.a-saldo'], title: 'Saldo previsto', text: 'Quanto vai sobrar no fim do mês depois de pagar tudo. Passe o mouse (ou toque) no “?” ao lado dos títulos para entender cada número.' },
  { page: 'visao', sel: ['.a-pagar'], title: 'Contas a pagar', text: 'O que vence no mês, por dia. Marque o círculo quando pagar. Tocando no nome você paga outro valor, ajusta só aquele mês ou pula.' },
  { page: 'visao', sel: ['.a-cred'], title: 'Saldo, crédito e dívidas', text: 'Quanto tem nas contas, quanto dá para gastar por dia, o limite livre dos cartões e tudo que ainda falta pagar.' },
  { page: 'visao', sel: ['.a-casa'], title: 'Divisão da casa', text: 'As contas da casa divididas pelo salário de cada um, e quem devolve quanto no Pix no fim do mês.' },
  { page: 'reserva', sel: ['.sv-grid', '.page-head'], title: 'Poupança', text: 'Crie caixinhas (reserva, viagem, carro) com meta e valor por mês. Quando entrar dinheiro, o app pergunta quanto guardar.' },
  { page: 'emprestimos', sel: ['.page-head'], title: 'Empréstimos', text: 'Cadastre valor, parcela e número de parcelas. A parcela do mês entra em Contas a pagar; antecipando, você vê o saldo devedor cair.' },
  { page: 'lembretes', sel: ['.page-head'], title: 'Pagamentos recorrentes', text: 'Para o que se repete por semana ou mês (ex.: pedreiro toda sexta até 12h). Você recebe o lembrete no dia e na hora.' },
  { page: 'bens', sel: ['.page-head'], title: 'Bens e patrimônio', text: 'Carro, casa, lote: valor de mercado (FIPE ou avaliação), quanto já pagou, quanto falta e os gastos ligados a cada um.' },
  { page: 'visao', sel: ['#bellBtn'], title: 'Notificações', text: 'Avisos de conta vencendo, limite do cartão, saldo baixo e um resumo do dia. Ative no celular em Configurações → Notificações.' },
  { page: 'visao', title: 'Pronto!', text: 'Siga os “Primeiros passos” no topo do painel. Dúvidas: use o “?” ao lado dos títulos ou a página Configurações → Como usar.' },
];
const tourKey = () => `casa-em-dia-tour-${state.user?.id || 0}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function startTour(i = 0) {
  state.tourStep = i;
  toggleSidebar(false);
  return showTourStep();
}
function endTour() {
  store.set(tourKey(), '1');
  state.tourStep = null;
  $('#tourLayer')?.remove();
  removeEventListener('resize', placeTour);
}
async function showTourStep() {
  const st = TOUR[state.tourStep];
  if (!st) return endTour();
  if (state.page !== st.page) location.hash = st.page;
  for (let t = 0; t < 40 && state.renderedPage !== st.page; t++) await sleep(100); // espera a tela desenhar
  let el = null;
  for (let t = 0; t < 30 && st.sel && !el; t++) {
    el = st.sel.map((q) => [...document.querySelectorAll(q)].find((x) => x.offsetParent !== null)).find(Boolean) || null;
    if (!el) await sleep(100);
  }
  let layer = $('#tourLayer');
  if (!layer) { layer = document.createElement('div'); layer.id = 'tourLayer'; document.body.appendChild(layer); addEventListener('resize', placeTour); }
  const n = TOUR.length;
  layer.innerHTML = `<div class="tour-hole ${el ? '' : 'none'}"></div>
    <div class="tour-pop" role="dialog" aria-labelledby="tourTitle">
      <small class="muted">${state.tourStep + 1} de ${n}</small>
      <h3 id="tourTitle">${esc(st.title)}</h3>
      <p>${esc(st.text)}</p>
      <div class="tour-actions"><button class="link-btn" id="tourSkip">${state.tourStep === n - 1 ? '' : 'Pular tour'}</button>
        <div style="display:flex;gap:8px">${state.tourStep ? '<button class="btn sm" id="tourBack">Voltar</button>' : ''}<button class="btn sm primary" id="tourNext">${state.tourStep === n - 1 ? 'Começar a usar' : 'Próximo'}</button></div></div>
    </div>`;
  state.tourEl = el;
  if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  placeTour();
  $('#tourNext').onclick = () => { state.tourStep++; showTourStep(); };
  const back = $('#tourBack'); if (back) back.onclick = () => { state.tourStep--; showTourStep(); };
  $('#tourSkip').onclick = endTour;
  $('#tourNext').focus();
}
function placeTour() {
  const layer = $('#tourLayer'); if (!layer) return;
  const hole = layer.querySelector('.tour-hole'); const pop = layer.querySelector('.tour-pop');
  const el = state.tourEl;
  if (!el) { pop.classList.add('center'); return; }
  pop.classList.remove('center');
  const r = el.getBoundingClientRect(); const pad = 8;
  Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  if (innerWidth <= 720) return; // no celular o balão fica fixo embaixo
  const w = Math.min(360, innerWidth - 24);
  pop.style.width = `${w}px`;
  const below = r.bottom + pad + 12 + pop.offsetHeight < innerHeight;
  const top = below ? r.bottom + pad + 12 : Math.max(12, r.top - pad - 12 - pop.offsetHeight);
  pop.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, r.left))}px`;
  pop.style.top = `${top}px`;
}

// ---------- acesso ----------
const can = (perm) => !!state.user?.perms?.includes(perm);
window.addEventListener('unhandledrejection', (e) => {
  const m = e.reason?.message;
  if (m && m !== 'login') toast(m);
});

// ---------- estado ----------
const state = {
  month: store.get('month', curMonth()),
  page: 'visao',
  data: null,
  dueFilter: null,
  cardIdx: 0,
  housingMode: 'meu',
};

// ---------- formulários ----------
const PANTRY_CATS = [['alimentos', 'Alimentos'], ['bebidas', 'Bebidas'], ['hortifruti', 'Frutas e verduras'], ['carnes', 'Carnes e frios'], ['limpeza', 'Limpeza'], ['higiene', 'Higiene'], ['pet', 'Pet'], ['outros', 'Outros']];
const PANTRY_UNITS = [['un', 'unidade'], ['kg', 'kg'], ['g', 'g'], ['L', 'litro'], ['ml', 'ml'], ['pct', 'pacote'], ['cx', 'caixa']];
const pantryOptions = () => (state.pantry || []).map((i) => [i.id, `${i.name} (${i.unit})`]);
const INC_KINDS = [['contrato', 'Contrato'], ['salario', 'Salário'], ['beneficio', 'Benefício (VA, VR…)'], ['freela', 'Freela'], ['outro', 'Outro']];
const INC_CYCLES = [['mensal', 'Todo mês'], ['quinzenal', 'Quinzenal (2 vezes no mês)'], ['semanal', 'Semanal'], ['avulso', 'Avulso (cada vez um valor, sem previsão)'], ['unica', 'Uma vez só (ex.: liberação de financiamento)']];
const INC_STATUS = { recebido: ['✓', 'green', 'Recebido'], parcial: ['◐', 'amber', 'Parcial'], previsto: ['○', 'gray', 'Previsto'], atrasado: ['⚠', 'red', 'Atrasado'], avulso: ['·', 'gray', 'Avulso'], fora: ['–', 'gray', 'Fora do período'] };
const incomeOptions = () => (state.incomes || []).filter((i) => i.active).map((i) => [i.id, i.name]);
const SUB_CATS = [['streaming', 'Filmes e séries'], ['musica', 'Música'], ['ia', 'Inteligência artificial'], ['software', 'Apps e software'], ['nuvem', 'Armazenamento na nuvem'], ['jogos', 'Jogos'], ['saude', 'Academia e saúde'], ['compras', 'Compras e delivery'], ['leitura', 'Notícias e leitura'], ['outros', 'Outros']];
const SUB_METHODS = [['cartao', 'Cartão de crédito'], ['pix', 'Pix'], ['debito', 'Débito em conta'], ['boleto', 'Boleto'], ['dinheiro', 'Dinheiro']];
const SUB_CYCLES = [['mensal', 'Mensal'], ['trimestral', 'Trimestral'], ['semestral', 'Semestral'], ['anual', 'Anual']];
const SUB_PLATFORMS = ['Netflix', 'Disney+', 'Prime Video', 'Max', 'Globoplay', 'Paramount+', 'Apple TV+', 'YouTube Premium', 'Spotify', 'Deezer', 'Apple Music', 'Claude (Anthropic)', 'ChatGPT (OpenAI)', 'Gemini (Google)', 'Microsoft 365', 'Google One', 'iCloud', 'Canva', 'Adobe', 'Xbox Game Pass', 'PlayStation Plus', 'Amazon Prime', 'Mercado Livre (Meli+)', 'iFood Clube', 'Smart Fit', 'Wellhub (Gympass)'];
const SUB_COLORS = { netflix: '#e50914', disney: '#113ccf', prime: '#00a8e1', amazon: '#ff9900', max: '#002be7', hbo: '#5822b4', globoplay: '#ff4f00', paramount: '#0064ff', youtube: '#ff0000', spotify: '#1db954', deezer: '#a238ff', apple: '#111827', icloud: '#3b82f6', claude: '#d97757', anthropic: '#d97757', chatgpt: '#10a37f', openai: '#10a37f', gemini: '#4285f4', google: '#4285f4', microsoft: '#0078d4', canva: '#00c4cc', adobe: '#fa0f00', xbox: '#107c10', playstation: '#003791', mercado: '#ffe600', ifood: '#ea1d2c', smart: '#fbbf24', wellhub: '#e3175d', gympass: '#e3175d' };
const subColor = (s) => { const t = `${s.platform || ''} ${s.name || ''}`.toLowerCase(); const k = Object.keys(SUB_COLORS).find((x) => t.includes(x)); return k ? SUB_COLORS[k] : '#64748b'; };
const subBadge = (s) => `<span class="sub-badge" style="background:${subColor(s)}">${esc((s.name || s.platform || '?').trim().charAt(0).toUpperCase())}</span>`;
const CATEGORIAS = ['Mercado', 'Restaurante', 'Transporte', 'Saúde', 'Lazer', 'Casa', 'Compras', 'Pets', 'Educação', 'Renda extra', 'Outros'];
const peopleOptions = () => (state.data?.people || []).map((p) => [p.id, p.name]);
const accountOptions = () => (state.data?.accounts?.list || []).map((a) => [a.id, a.name]);
const assetOptions = () => (state.data?.assets?.list || []).map((a) => [a.id, a.name]);
const ASSET_KINDS = [['veiculo', 'Veículo'], ['imovel', 'Imóvel / casa'], ['terreno', 'Terreno / lote / obra'], ['outro', 'Outro']];
const assetIcon = (k) => ({ veiculo: 'carro', imovel: 'casinha', terreno: 'projetos' }[k] || 'dinheiro');
const myAccount = () => (state.data?.accounts?.list || []).find((a) => a.owner_id === state.data?.me?.id)?.id;
const cardOptions = () => (state.data?.cards || []).map((c) => [c.id, `${c.bank || ''} ${c.name}`.trim()]);

// Catálogo de bancos vem do banco de dados (/api/banks). Tela "Bancos" em Ajustes edita.
let PRESETS = {};
let BANKS = [];
const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const safeColor = (c, fb = '#1f2937') => (/^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : fb);
function setBanks(list) {
  BANKS = list;
  PRESETS = Object.fromEntries(list.map((b) => [b.slug, {
    ...b, bg: `linear-gradient(135deg,${safeColor(b.color)},${safeColor(b.color2 || b.color)})`, fg: safeColor(b.fg, '#fff'), tier: b.tier || '',
  }]));
}
// Acha o modelo pelo nome digitado do banco (ex.: "nu", "itau", "banco do brasil").
function findBank(text) {
  const t = norm(text);
  if (!t) return null;
  const main = BANKS.filter((b) => !b.tier);
  const hit = (b) => [b.bank, b.label, ...(b.aliases || '').split(',')].map(norm).filter(Boolean);
  return main.find((b) => hit(b).includes(t)) || main.find((b) => hit(b).some((h) => h.startsWith(t) && t.length >= 3)) || null;
}
const NETWORKS = [['mastercard', 'Mastercard'], ['visa', 'Visa'], ['elo', 'Elo'], ['amex', 'American Express'], ['hipercard', 'Hipercard']];

// Status da fatura do mês: Paga, Fechada (já passou o fechamento) ou Aberta.
function cardStatus(c, month) {
  if (c.paid) return ['Paga', 'paid'];
  const [y, m] = month.split('-').map(Number);
  // Fecha no mesmo mês do vencimento se o dia de fechamento vem antes; senão, no mês anterior.
  const close = new Date(y, c.closing_day < c.due_day ? m - 1 : m - 2, c.closing_day);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return t >= close ? ['Fechada', 'closed'] : ['Aberta', 'open'];
}

function cardVisual(c, opts = {}) {
  const p = c.__p ? { ...c.__p, bg: `linear-gradient(135deg,${c.__p.color},${c.__p.color2 || c.__p.color})` } : PRESETS[c.preset];
  const bg = c.image ? `background-image:url('${c.image}');background-size:cover;background-position:center`
    : p ? `background:${p.bg}` : `background-color:${esc(c.color || '#1f2937')}`;
  const fg = c.image ? '#fff' : p ? p.fg : '#fff';
  const month = opts.month || state.month;
  const [st, cls] = cardStatus(c, month);
  const net = NETWORKS.find(([k]) => k === c.network);
  const attrs = opts.attrs || '';
  return `<div class="ccard ${c.image ? 'has-img' : ''} ${opts.sel ? 'sel' : ''} ${opts.cls || ''}" ${attrs} style="${bg};color:${fg}">
    <div class="top"><span class="bk">${esc(c.bank || p?.bank || '')}</span><span class="tag st-${cls}">${st}</span></div>
    <div class="mid"><span class="chip-ic"></span><span class="nm">${esc(c.name || p?.tier || '')}</span><span class="nfc">)))</span></div>
    <div class="foot"><span>VENCE<b>${String(c.due_day || 1).padStart(2, '0')}/${month.slice(5)}</b></span><span class="lim">LIMITE LIVRE<b>${money(c.free_limit ?? c.limit_total ?? 0)}</b></span>${net ? `<span class="net net-${net[0]}">${net[0] === 'mastercard' ? '<i></i><i></i>' : esc(net[0] === 'amex' ? 'AMEX' : net[1])}</span>` : ''}</div>
  </div>`;
}

// Reduz a foto do cartão para guardar no banco (máx. 720px, JPEG).
function imageToDataUrl(file, max = 720) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, max / img.width);
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui ler essa imagem')); };
    img.src = url;
  });
}

const FORMS = {
  transaction: {
    title: 'Lançamento', resource: 'transactions',
    defaults: () => ({ type: 'saida', kind: 'normal', date: state.month === curMonth() ? today() : `${state.month}-01`, person_id: state.data?.me?.id, account_id: myAccount() }),
    fields: [
      { row: [{ k: 'type', label: 'Tipo', type: 'select', options: [['saida', 'Saída (gasto)'], ['entrada', 'Entrada (renda extra)']] }, { k: 'kind', label: 'Conta no resumo?', type: 'select', options: [['normal', 'Sim (gasto ou renda)'], ['pagamento_fatura', 'Não: pagamento de fatura'], ['transferencia', 'Não: transferência / saque']] }] },
      { k: 'description', label: 'Descrição', required: true },
      { row: [{ k: 'amount', label: 'Valor (R$)', type: 'money', required: true }, { k: 'date', label: 'Data', type: 'date', required: true }] },
      { row: [{ k: 'category', label: 'Categoria', datalist: CATEGORIAS }, { k: 'person_id', label: 'Pessoa', type: 'select', options: peopleOptions }] },
      { row: [{ k: 'account_id', label: 'Conta (Pix, débito, saque)', type: 'select', options: accountOptions, hint: 'Vazio = dinheiro' }, { k: 'asset_id', label: 'Bem (opcional)', type: 'select', options: assetOptions, hint: 'Ex.: manutenção do carro' }] },
    ],
  },
  bill: {
    title: 'Conta', resource: 'bills',
    defaults: () => ({ kind: 'casa', due_day: 10, owner_id: state.data?.me?.id, start_month: state.month, active: 1 }),
    fields: [
      { k: 'name', label: 'Nome', required: true },
      { row: [{ k: 'amount', label: 'Valor mensal (R$)', type: 'money', required: true }, { k: 'due_day', label: 'Vence dia', type: 'number', min: 1, max: 31 }] },
      { row: [{ k: 'kind', label: 'Tipo', type: 'select', options: [['casa', 'Da casa (dividida)'], ['pessoal', 'Pessoal']] }, { k: 'owner_id', label: 'Quem paga', type: 'select', options: peopleOptions }] },
      { row: [{ k: 'start_month', label: 'Começa em', type: 'month' }, { k: 'end_month', label: 'Termina em', type: 'month', hint: 'Vazio = todo mês' }] },
      { k: 'is_housing', label: 'Faz parte do custo de moradia', type: 'checkbox' },
      { k: 'is_reserve', label: 'É depósito na reserva (ao pagar, soma na reserva)', type: 'checkbox' },
      { k: 'active', label: 'Ativa', type: 'checkbox' },
      { row: [{ k: 'account_id', label: 'Sai da conta (opcional)', type: 'select', options: accountOptions, hint: 'Ao pagar, sai do saldo dessa conta' }, { k: 'asset_id', label: 'Bem (opcional)', type: 'select', options: assetOptions, hint: 'Ex.: parcela do lote' }] },
      { k: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  purchase: {
    title: 'Compra no cartão', resource: 'purchases',
    defaults: () => ({ installments: 1, first_month: state.month, card_id: state.data?.cards?.[state.cardIdx]?.id }),
    fields: [
      { k: 'card_id', label: 'Cartão', type: 'select', options: cardOptions, required: true },
      { k: 'description', label: 'Descrição', required: true },
      { row: [{ k: 'total', label: 'Valor total (R$)', type: 'money', required: true }, { k: 'installments', label: 'Parcelas', type: 'number', min: 1, max: 48 }] },
      { row: [{ k: 'first_month', label: 'Primeira fatura', type: 'month', required: true }, { k: 'asset_id', label: 'Bem (opcional)', type: 'select', options: assetOptions }] },
    ],
  },
  card: {
    title: 'Cartão', resource: 'cards',
    defaults: () => ({ color: '#1f2937', closing_day: 28, due_day: 5, owner_id: state.data?.me?.id, network: 'mastercard' }),
    preview: (v) => cardVisual({ ...v, free_limit: Number(v.limit_total) || 0, paid: 0 }, { cls: 'preview' }),
    fields: [
      { k: 'preset', label: 'Modelo do cartão', type: 'preset' },
      { k: 'image', label: 'Ou use a foto/arte do seu cartão', type: 'image', hint: 'Opcional. Fica no lugar do modelo; status, vencimento e limite aparecem por cima.' },
      { row: [{ k: 'bank', label: 'Banco', datalist: () => [...new Set(BANKS.map((b) => b.bank))], hint: 'Digite o banco: a cor do cartão vem sozinha' }, { k: 'name', label: 'Nome do cartão', required: true }] },
      { row: [{ k: 'limit_total', label: 'Limite (R$)', type: 'money' }, { k: 'network', label: 'Bandeira', type: 'select', options: NETWORKS }] },
      { k: 'color', label: 'Cor (quando não há modelo)', type: 'color' },
      { row: [{ k: 'closing_day', label: 'Fecha dia', type: 'number', min: 1, max: 31 }, { k: 'due_day', label: 'Vence dia', type: 'number', min: 1, max: 31 }] },
      { k: 'owner_id', label: 'Titular', type: 'select', options: peopleOptions },
      { row: [{ k: 'kind', label: 'Tipo', type: 'select', options: [['credito', 'Crédito'], ['multiplo', 'Débito e crédito']] }, { k: 'account_id', label: 'Conta vinculada', type: 'select', options: accountOptions }] },
      { k: 'auto_debit', label: 'Fatura em débito automático nessa conta (no dia do vencimento)', type: 'checkbox' },
    ],
  },
  saving: {
    title: 'Caixinha', resource: 'savings',
    defaults: () => ({ icon: 'porquinho', day: 5, owner_id: state.data?.me?.id, active: 1 }),
    fields: [
      { row: [{ k: 'name', label: 'Nome', required: true, hint: 'Ex.: Viagem, Carro, Reserva' }, { k: 'icon', label: 'Ícone', type: 'select', options: SV_ICONS, required: true }] },
      { k: 'account', label: 'Onde o dinheiro fica', datalist: () => ['Caixinha Nubank', 'Porquinho Inter', 'CDB liquidez diária', 'Tesouro Selic', 'Poupança', ...new Set(BANKS.map((b) => b.bank))], hint: 'A conta ou investimento que guarda esta caixinha' },
      { row: [{ k: 'goal', label: 'Meta (R$)', type: 'money', hint: 'Opcional' }, { k: 'target_month', label: 'Até quando', type: 'month', hint: 'Opcional' }] },
      { row: [{ k: 'monthly', label: 'Guardar por mês (R$)', type: 'money', hint: 'Vazio + meta e prazo = o app calcula' }, { k: 'day', label: 'Dia de guardar', type: 'number', min: 1, max: 31, hint: 'Ex.: dia que cai o salário' }] },
      { row: [{ k: 'owner_id', label: 'De quem é', type: 'select', options: peopleOptions }, { k: 'from_account_id', label: 'Sai de qual conta', type: 'select', options: accountOptions, hint: 'Opcional: o depósito do mês sai dessa conta' }] },
      { k: 'active', label: 'Ativa', type: 'checkbox' },
    ],
  },
  loan: {
    title: 'Empréstimo', resource: 'loans',
    defaults: () => ({ first_date: today(), installments: 48, owner_id: state.data?.me?.id, active: 1 }),
    fields: [
      { row: [{ k: 'name', label: 'Nome', required: true, hint: 'Ex.: Empréstimo pessoal, Consignado' }, { k: 'lender', label: 'Banco / credor', datalist: () => [...new Set(BANKS.map((b) => b.bank))] }] },
      { row: [{ k: 'principal', label: 'Valor pego (R$)', type: 'money' }, { k: 'installment', label: 'Valor da parcela (R$)', type: 'money', required: true }] },
      { row: [{ k: 'installments', label: 'Nº de parcelas', type: 'number', min: 1, max: 600, required: true }, { k: 'first_date', label: '1ª parcela em', type: 'date', required: true, hint: 'O dia vira o vencimento mensal' }] },
      { row: [{ k: 'owner_id', label: 'Quem paga', type: 'select', options: peopleOptions }, { k: 'account_id', label: 'Debita da conta', type: 'select', options: accountOptions }] },
      { k: 'asset_id', label: 'É financiamento de um bem? (opcional)', type: 'select', options: assetOptions },
      { row: [{ k: 'bank_balance', label: 'Saldo devedor segundo o banco (R$)', type: 'money', hint: 'Opcional: o valor para quitar hoje, do app ou extrato do banco' }, { k: 'bank_balance_date', label: 'Consultado em', type: 'date' }] },
      { k: 'notes', label: 'Observações', type: 'textarea' },
      { k: 'active', label: 'Ativo', type: 'checkbox' },
    ],
  },
  loanpay: {
    title: 'Pagamento de empréstimo', resource: 'loanpay',
    defaults: () => ({ date: today(), kind: 'extra', covers: 1 }),
    fields: [
      { k: 'loan_id', label: 'Empréstimo', type: 'select', required: true, options: () => (state.data?.loans || []).map((l) => [l.id, l.name]) },
      { row: [{ k: 'kind', label: 'Tipo', type: 'select', options: [['extra', 'Antecipação (quita parcelas do fim)'], ['parcela', 'Parcela normal']] }, { k: 'date', label: 'Data', type: 'date', required: true }] },
      { row: [{ k: 'amount', label: 'Valor pago (R$)', type: 'money', required: true }, { k: 'covers', label: 'Parcelas quitadas', type: 'number', min: 0, hint: 'Na antecipação: quantas parcelas o banco abateu' }] },
      { k: 'installment_no', label: 'Nº da parcela (só para parcela normal)', type: 'number', min: 1 },
      { k: 'note', label: 'Observação' },
    ],
  },
  reminder: {
    title: 'Pagamento recorrente / lembrete', resource: 'reminders',
    defaults: () => ({ frequency: 'semanal', weekday: 5, time: '12:00', start_date: today(), owner_id: state.data?.me?.id, active: 1 }),
    fields: [
      { row: [{ k: 'name', label: 'Nome', required: true, hint: 'Ex.: Pedreiro, Diarista, Mesada' }, { k: 'amount', label: 'Valor (R$)', type: 'money', required: true }] },
      { row: [{ k: 'frequency', label: 'Repete', type: 'select', required: true, options: [['semanal', 'Toda semana'], ['quinzenal', 'A cada 15 dias'], ['mensal', 'Todo mês'], ['diaria', 'Todo dia'], ['unica', 'Uma vez só']] }, { k: 'time', label: 'Avisar até', type: 'time', hint: 'Hora do lembrete' }] },
      { row: [{ k: 'weekday', label: 'Dia da semana', type: 'select', options: [[0, 'Domingo'], [1, 'Segunda'], [2, 'Terça'], [3, 'Quarta'], [4, 'Quinta'], [5, 'Sexta'], [6, 'Sábado']], show: (v) => ['semanal', 'quinzenal'].includes(v.frequency) }, { k: 'day', label: 'Dia do mês', type: 'number', min: 1, max: 31, show: (v) => v.frequency === 'mensal' }] },
      { row: [{ k: 'start_date', label: (v) => (v.frequency === 'unica' ? 'Data' : 'Começa em'), type: 'date' }, { k: 'end_date', label: 'Termina em', type: 'date', hint: 'Vazio = sem fim', show: (v) => v.frequency !== 'unica' }] },
      { row: [{ k: 'account_id', label: 'Paga com', type: 'select', options: accountOptions, hint: 'Vazio = dinheiro' }, { k: 'category', label: 'Categoria', datalist: CATEGORIAS.concat(['Obra', 'Serviços']) }] },
      { row: [{ k: 'owner_id', label: 'De quem é', type: 'select', options: peopleOptions }, { k: 'asset_id', label: 'Bem (opcional)', type: 'select', options: assetOptions, hint: 'Ex.: pedreiro → obra da casa' }] },
      { k: 'notes', label: 'Observações', type: 'textarea' },
      { k: 'active', label: 'Ativo', type: 'checkbox' },
    ],
  },
  pantry: {
    title: 'Produto da despensa', resource: 'pantry',
    defaults: () => ({ category: 'alimentos', unit: 'un', qty: 0, min_qty: 1, active: 1 }),
    fields: [
      { row: [{ k: 'name', label: 'Produto', required: true, hint: 'Ex.: Arroz, Detergente, Papel higiênico' }, { k: 'category', label: 'Categoria', type: 'select', options: PANTRY_CATS }] },
      { row: [{ k: 'unit', label: 'Unidade', type: 'select', options: PANTRY_UNITS }, { k: 'qty', label: 'Tem em casa agora', type: 'number', min: 0 }] },
      { k: 'min_qty', label: 'Mínimo para ter em casa', type: 'number', min: 0, hint: 'Chegou nisso ou menos, entra na lista de compras. 0 = o app decide pelo seu consumo.' },
      { k: 'notes', label: 'Observações', hint: 'Ex.: marca preferida, tamanho da embalagem' },
      { k: 'active', label: 'Ativo (desmarque para parar de acompanhar)', type: 'checkbox' },
    ],
  },
  pantryBuy: {
    title: 'Comprei', resource: 'despensa/buy',
    defaults: () => ({ qty: 1, date: today() }),
    fields: [
      { k: 'item_id', label: 'Produto', type: 'select', options: pantryOptions, required: true },
      { row: [{ k: 'qty', label: 'Quantidade', type: 'number', min: 0, required: true }, { k: 'total', label: 'Valor pago no total (R$)', type: 'money', hint: 'O app calcula o preço por unidade' }] },
      { row: [{ k: 'store', label: 'Mercado', hint: 'Opcional' }, { k: 'date', label: 'Data', type: 'date' }] },
      { k: 'launch', label: 'Lançar também como gasto (categoria Mercado)', type: 'checkbox' },
      { k: 'account_id', label: 'Pago com a conta (se lançar como gasto)', type: 'select', options: accountOptions, hint: 'Vazio = dinheiro' },
    ],
  },
  income: {
    title: 'Receita / contrato', resource: 'incomes',
    defaults: () => ({ kind: 'contrato', cycle: 'mensal', amount_type: 'fixo', installments_per_cycle: 1, start_month: state.month, owner_id: state.data?.me?.id, renewal: 'nao_renova', active: 1 }),
    fields: [
      { row: [{ k: 'name', label: 'Nome', required: true, hint: 'Ex.: Contrato Inverno de Itália, Salário, Vale-alimentação' }, { k: 'payer', label: 'Quem paga', hint: 'Cliente, empresa, órgão' }] },
      { row: [{ k: 'kind', label: 'Tipo', type: 'select', options: INC_KINDS, required: true }, { k: 'cycle', label: 'Como entra', type: 'select', options: INC_CYCLES, required: true }] },
      { row: [{ k: 'amount', label: (v) => (v.cycle === 'avulso' ? 'Valor (opcional)' : v.cycle === 'unica' ? 'Valor (R$)' : 'Valor do mês (R$)'), type: 'money', required: true, hint: (v) => (v.amount_type === 'variavel' ? 'Estimativa: a previsão passa a usar a média dos 3 últimos meses recebidos' : '') }, { k: 'amount_type', label: 'Valor', type: 'select', options: [['fixo', 'Fixo'], ['variavel', 'Variável (muda todo mês)']], show: (v) => !['avulso', 'unica'].includes(v.cycle) }] },
      { row: [{ k: 'day', label: 'Dia que costuma cair', type: 'number', min: 1, max: 31, hint: 'Vazio = último dia do mês', show: (v) => v.cycle !== 'avulso' }, { k: 'installments_per_cycle', label: 'Paga em quantas vezes no mês', type: 'number', min: 1, max: 5, show: (v) => v.cycle === 'mensal', hint: 'Ex.: 2 = duas vezes de 500' }] },
      { row: [{ k: 'owner_id', label: 'Quem recebe', type: 'select', options: peopleOptions, required: true }, { k: 'account_id', label: 'Conta onde cai', type: 'select', options: accountOptions, hint: 'Entra no saldo previsto dela' }] },
      { row: [{ k: 'start_month', label: (v) => (v.cycle === 'unica' ? 'Mês previsto' : 'Começa em'), type: 'month', required: true }, { k: 'total_months', label: 'Duração (meses)', type: 'number', min: 1, max: 360, hint: 'Ou informe o mês final ao lado', show: (v) => !['avulso', 'unica'].includes(v.cycle) }] },
      { row: [{ k: 'end_month', label: 'Termina em', type: 'month', hint: 'Vazio = sem prazo', show: (v) => !['avulso', 'unica'].includes(v.cycle) }, { k: 'renewal', label: 'No fim', type: 'select', options: [['nao_renova', 'Não renova'], ['avisar', 'Me avisar 15 dias antes'], ['automatica', 'Renova sozinho']], show: (v) => !['avulso', 'unica'].includes(v.cycle) }] },
      { k: 'amount_from', label: 'Novo valor vale a partir de', type: 'month', hint: 'Só ao mudar o valor (reajuste). Vazio = mês que vem; os meses anteriores não mudam.', show: (v) => !!v.id },
      { k: 'category', label: 'Categoria (opcional)', hint: 'Ex.: Social media, Eventos' },
      { k: 'notes', label: 'Observações', type: 'textarea', hint: 'Ex.: geralmente paga em 2x de R$ 500' },
      { k: 'active', label: 'Ativa', type: 'checkbox' },
    ],
  },
  receive: {
    title: 'Recebi', resource: 'receive',
    defaults: () => ({ date: today(), ref_month: state.month }),
    fields: [
      { k: 'income_id', label: 'Receita', type: 'select', options: incomeOptions, required: true },
      { row: [{ k: 'amount', label: 'Valor recebido (R$)', type: 'money', required: true }, { k: 'date', label: 'Data', type: 'date', required: true }] },
      { row: [{ k: 'account_id', label: 'Caiu na conta', type: 'select', options: accountOptions, hint: 'Vazio = dinheiro' }, { k: 'ref_month', label: 'Referente ao mês', type: 'month' }] },
      { k: 'note', label: 'Observação', hint: 'Ex.: 1ª parcela, aniversário da Ana' },
    ],
  },
  transfer: {
    title: 'Transferência entre contas', resource: 'transfer',
    defaults: () => ({ date: today() }),
    fields: [
      { row: [{ k: 'from_account_id', label: 'Sai da conta', type: 'select', options: accountOptions, required: true }, { k: 'to_account_id', label: 'Entra na conta', type: 'select', options: accountOptions, required: true }] },
      { row: [{ k: 'amount', label: 'Valor (R$)', type: 'money', required: true }, { k: 'date', label: 'Data', type: 'date', required: true }] },
      { k: 'note', label: 'Descrição', hint: 'Não conta como renda nem como gasto' },
    ],
  },
  subscription: {
    title: 'Assinatura', resource: 'subscriptions',
    defaults: () => ({ method: 'cartao', cycle: 'mensal', currency: 'BRL', category: 'outros', day: new Date().getDate(), start_month: curMonth(), owner_id: state.data?.me?.id, active: 1 }),
    fields: [
      { row: [{ k: 'name', label: 'Nome', required: true, hint: 'Ex.: Claude Pro, Netflix, Spotify Família' }, { k: 'platform', label: 'Plataforma / empresa', datalist: SUB_PLATFORMS }] },
      { row: [{ k: 'plan', label: 'Plano', hint: 'Ex.: Pro, Padrão com anúncios, Família' }, { k: 'category', label: 'Tipo', type: 'select', options: SUB_CATS }] },
      { row: [{ k: 'amount', label: 'Valor cobrado (R$)', type: 'money', required: true, hint: (v) => (v.currency && v.currency !== 'BRL' ? 'Quanto vem na fatura em reais (com câmbio e IOF)' : '') }, { k: 'cycle', label: 'Cobrança', type: 'select', options: SUB_CYCLES, required: true }] },
      { row: [{ k: 'currency', label: 'Moeda do plano', type: 'select', options: [['BRL', 'Real (R$)'], ['USD', 'Dólar (US$)'], ['EUR', 'Euro (€)']] }, { k: 'amount_original', label: (v) => `Preço em ${v.currency === 'EUR' ? 'euro' : 'dólar'}`, type: 'number', show: (v) => v.currency && v.currency !== 'BRL', hint: 'Ex.: 20 (Claude Pro)' }] },
      { row: [{ k: 'method', label: 'Forma de pagamento', type: 'select', options: SUB_METHODS, required: true }, { k: 'day', label: 'Dia da cobrança', type: 'number', min: 1, max: 31 }] },
      { row: [{ k: 'card_id', label: 'Cartão', type: 'select', options: cardOptions, show: (v) => v.method === 'cartao', hint: 'A cobrança entra sozinha na fatura dele' }, { k: 'account_id', label: (v) => (v.method === 'boleto' ? 'Pago com a conta' : 'Sai da conta'), type: 'select', options: accountOptions, show: (v) => ['pix', 'debito', 'boleto'].includes(v.method), hint: 'Aparece em Contas a pagar no dia' }] },
      { row: [{ k: 'start_month', label: 'Assinante desde', type: 'month' }, { k: 'end_month', label: 'Cancelada / termina em', type: 'month', hint: 'Vazio = continua' }] },
      { row: [{ k: 'owner_id', label: 'De quem é', type: 'select', options: peopleOptions }, { k: 'url', label: 'Link para gerenciar ou cancelar', hint: 'Ex.: claude.ai/settings/billing' }] },
      { k: 'notes', label: 'Observações', type: 'textarea', hint: 'Ex.: dividida com a família, renova em março, preço promocional até…' },
      { k: 'active', label: 'Ativa', type: 'checkbox' },
    ],
  },
  asset: {
    title: 'Bem', resource: 'assets',
    defaults: () => ({ kind: 'veiculo', fipe_type: 'cars', owner_id: state.data?.me?.id, value_date: today(), active: 1 }),
    fields: (() => {
      const is = (...k) => (v) => k.includes(v.kind);
      const ph = { veiculo: 'Ex.: Meu carro, Moto', imovel: 'Ex.: Casa, Apartamento', terreno: 'Ex.: Lote do loteamento', outro: 'Ex.: Equipamento, Barco' };
      return [
        { row: [{ k: 'kind', label: 'Tipo', type: 'select', options: ASSET_KINDS, required: true }, { k: 'name', label: 'Nome', required: true, hint: (v) => ph[v.kind] || '' }] },
        { row: [{ k: 'brand', label: 'Marca', show: is('veiculo', 'outro') }, { k: 'model', label: 'Modelo', show: is('veiculo', 'outro') }] },
        { row: [{ k: 'year', label: (v) => (v.kind === 'imovel' ? 'Ano de construção' : 'Ano'), show: is('veiculo', 'imovel') }, { k: 'plate', label: 'Placa', show: is('veiculo') }] },
        { row: [{ k: 'address', label: (v) => (v.kind === 'terreno' ? 'Localização / loteamento' : 'Endereço'), show: is('imovel', 'terreno') }, { k: 'area', label: 'Área (m²)', type: 'number', show: is('imovel', 'terreno') }] },
        { row: [{ k: 'purchase_date', label: 'Comprado em', type: 'date' }, { k: 'purchase_price', label: (v) => (v.kind === 'terreno' ? 'Valor pago no lote (R$)' : 'Valor de compra (R$)'), type: 'money' }] },
        { row: [{ k: 'market_value', label: (v) => (v.kind === 'veiculo' ? 'Valor FIPE / mercado (R$)' : 'Valor de avaliação (R$)'), type: 'money', hint: (v) => (v.kind === 'veiculo' ? 'Ou use “Buscar na FIPE” na tela do bem' : 'Quanto vale hoje (corretor, anúncios da região)') }, { k: 'value_date', label: 'Valor em', type: 'date' }] },
        { k: 'paid_before', label: 'Já pago antes de usar o app (R$)', type: 'money', hint: (v) => (v.kind === 'veiculo' ? 'Ex.: entrada + parcelas do financiamento já pagas' : 'Ex.: entrada + parcelas do lote já pagas') },
        { row: [{ k: 'fipe_type', label: 'Tipo na FIPE', type: 'select', options: [['cars', 'Carro'], ['motorcycles', 'Moto'], ['trucks', 'Caminhão']], show: is('veiculo') }, { k: 'fipe_code', label: 'Código FIPE', show: is('veiculo'), hint: 'Preenchido pelo “Buscar na FIPE”' }] },
        { k: 'fipe_year', label: 'Ano-modelo FIPE', show: is('veiculo'), hint: 'Ex.: 2021-1 (preenchido pela busca)' },
        { k: 'owner_id', label: 'Dono', type: 'select', options: peopleOptions },
        { k: 'notes', label: 'Observações', type: 'textarea' },
        { k: 'active', label: 'Ativo', type: 'checkbox' },
      ];
    })(),
  },
  account: {
    title: 'Conta bancária', resource: 'accounts',
    defaults: () => ({ owner_id: state.data?.me?.id, opening_date: today(), active: 1 }),
    preview: (v) => accountHead({ ...v, balance: Number(v.opening_balance) || 0, cards: [] }, { cls: 'preview' }),
    fields: [
      { row: [{ k: 'bank', label: 'Banco', datalist: () => [...new Set(BANKS.map((b) => b.bank))], hint: 'A cor vem sozinha' }, { k: 'name', label: 'Nome da conta', required: true, hint: 'Ex.: Conta Sicredi' }] },
      { k: 'preset', label: 'Cor', type: 'preset' },
      { row: [{ k: 'opening_balance', label: 'Saldo atual (R$)', type: 'money', hint: 'O que tem na conta na data ao lado' }, { k: 'opening_date', label: 'Saldo em', type: 'date', required: true }] },
      { row: [{ k: 'owner_id', label: 'Titular', type: 'select', options: peopleOptions }, { k: 'salary_day', label: 'Salário cai dia', type: 'number', min: 1, max: 31, hint: 'Vazio = não recebe salário aqui' }] },
      { k: 'notes', label: 'Observações', type: 'textarea' },
      { k: 'active', label: 'Ativa', type: 'checkbox' },
    ],
  },
  move: {
    title: 'Ajuste na conta', resource: 'moves',
    defaults: () => ({ date: today(), account_id: myAccount(), kind: 'ajuste' }),
    fields: [
      { k: 'account_id', label: 'Conta', type: 'select', options: accountOptions, required: true },
      { row: [{ k: 'amount', label: 'Valor (R$)', type: 'money', required: true, hint: 'Positivo entra, negativo sai' }, { k: 'date', label: 'Data', type: 'date', required: true }] },
      { k: 'kind', label: 'Tipo', type: 'select', options: [['ajuste', 'Ajuste de saldo'], ['deposito', 'Depósito'], ['saque', 'Saque'], ['transferencia', 'Transferência'], ['rendimento', 'Rendimento']] },
      { k: 'note', label: 'Descrição' },
    ],
  },
  bank: {
    title: 'Banco', resource: 'banks',
    defaults: () => ({ color: '#2563eb', color2: '#1e3a8a', fg: '#ffffff', source: 'manual' }),
    preview: (v) => cardVisual({ bank: v.bank, name: v.tier || v.label, due_day: 10, limit_total: 0, free_limit: 0, preset: '__p', network: 'mastercard', __p: v }, { cls: 'preview' }),
    fields: [
      { row: [{ k: 'bank', label: 'Banco', required: true }, { k: 'label', label: 'Nome do modelo', required: true }] },
      { row: [{ k: 'color', label: 'Cor principal', type: 'color' }, { k: 'color2', label: 'Cor do degradê', type: 'color' }] },
      { row: [{ k: 'fg', label: 'Cor do texto', type: 'color' }, { k: 'tier', label: 'Linha (ex.: Black)', hint: 'Vazio = cartão padrão do banco' }] },
      { k: 'aliases', label: 'Outros nomes (separados por vírgula)', hint: 'Ajuda a reconhecer o banco quando digitar' },
    ],
  },
  person: {
    title: 'Pessoa', resource: 'people',
    defaults: () => ({ color: '#f43f5e' }),
    fields: [
      { k: 'name', label: 'Nome', required: true },
      { row: [{ k: 'salary', label: 'Salário líquido (R$)', type: 'money', hint: 'Cadastrou o salário em Receitas (tipo Salário)? Então este campo deixa de ser usado' }, { k: 'color', label: 'Cor', type: 'color' }] },
      { k: 'is_me', label: 'Sou eu (o painel é calculado para esta pessoa)', type: 'checkbox' },
    ],
  },
  reserve: {
    title: 'Guardar ou retirar', resource: 'reserve',
    defaults: () => ({ date: today(), savings_id: state.data?.savings?.[0]?.id }),
    fields: [
      { k: 'savings_id', label: 'Caixinha', type: 'select', required: true, options: () => (state.data?.savings || []).map((x) => [x.id, x.name]) },
      { row: [{ k: 'amount', label: 'Valor (R$)', type: 'money', required: true, hint: 'Negativo = retirada' }, { k: 'date', label: 'Data', type: 'date', required: true }] },
      { k: 'note', label: 'Descrição' },
    ],
  },
  project: {
    title: 'Projeto', resource: 'projects',
    defaults: () => ({ status: 'estimado', start_month: state.month }),
    fields: [
      { k: 'name', label: 'Nome', required: true },
      { k: 'description', label: 'Descrição' },
      { row: [{ k: 'monthly_amount', label: 'Valor do mês (R$)', type: 'money' }, { k: 'budget_total', label: 'Orçamento total (R$)', type: 'money' }] },
      { row: [{ k: 'status', label: 'Status', type: 'select', options: [['estimado', 'Estimado'], ['confirmado', 'Confirmado'], ['pago', 'Pago']] }, { k: 'start_month', label: 'Início', type: 'month' }] },
      { row: [{ k: 'end_month', label: 'Fim', type: 'month' }, { k: 'asset_id', label: 'Bem (opcional)', type: 'select', options: assetOptions }] },
    ],
  },
};

// Campos podem ter: show(valores) → aparece ou não; label/hint como função dos valores.
const fLabel = (f, vals) => (typeof f.label === 'function' ? f.label(vals || {}) : f.label);
const fHint = (f, vals) => (typeof f.hint === 'function' ? f.hint(vals || {}) : f.hint);
function fieldHtml(f, v, vals) {
  const id = `f_${f.k}`;
  const val = v ?? '';
  const req = f.required ? 'required' : '';
  f = { ...f, label: fLabel(f, vals), hint: fHint(f, vals) };
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  if (f.type === 'checkbox') {
    return `<div class="field check-field"><input type="checkbox" id="${id}" name="${f.k}" ${val ? 'checked' : ''}><label for="${id}">${esc(f.label)}</label></div>`;
  }
  if (f.type === 'preset') {
    return `<div class="field"><label>${esc(f.label)}</label><input type="hidden" id="${id}" name="${f.k}" value="${esc(val)}">
      <div class="preset-grid">${Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="preset ${k === val ? 'on' : ''}" data-preset="${k}" title="${esc(p.label)}"><span style="background:${p.bg};color:${p.fg}">${esc(p.bank.split(' ')[0])}</span><small>${esc(p.label)}</small></button>`).join('')}
      <button type="button" class="preset ${!val ? 'on' : ''}" data-preset=""><span style="background:var(--panel-2);color:var(--muted)">Cor</span><small>Personalizado</small></button></div></div>`;
  }
  if (f.type === 'image') {
    return `<div class="field"><label>${esc(f.label)}</label><input type="hidden" id="${id}" name="${f.k}" value="${esc(val)}">
      <div class="img-pick"><label class="btn sm">${I.camera} Escolher imagem<input type="file" accept="image/*" id="${id}_file" hidden></label><button type="button" class="btn sm" id="${id}_clear" ${val ? '' : 'hidden'}>Remover</button></div>${hint}</div>`;
  }
  let input;
  if (f.type === 'select') {
    const opts = typeof f.options === 'function' ? f.options() : f.options;
    input = `<select id="${id}" name="${f.k}" ${req}>${f.required ? '' : '<option value="">—</option>'}${opts.map(([o, l]) => `<option value="${esc(o)}" ${String(o) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${f.k}" rows="2">${esc(val)}</textarea>`;
  } else {
    const type = f.type === 'money' ? 'number' : (f.type || 'text');
    const step = f.type === 'money' ? 'step="0.01" inputmode="decimal"' : '';
    const list = f.datalist ? `list="${id}_l"` : '';
    input = `<input id="${id}" name="${f.k}" type="${type}" value="${esc(val)}" ${step} ${list} ${req} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>`;
    if (f.datalist) input += `<datalist id="${id}_l">${(typeof f.datalist === 'function' ? f.datalist() : f.datalist).map((d) => `<option value="${esc(d)}">`).join('')}</datalist>`;
  }
  return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${hint}</div>`;
}

const wrapField = (f, values) => fieldHtml(f, values[f.k], values).replace('<div class="field', `<div data-field="${f.k}" class="field`);

function openForm(name, record = null) {
  const def = FORMS[name];
  const editing = record && record.id;
  const values = { ...(def.defaults ? def.defaults() : {}), ...(record || {}) };
  const flat = def.fields.flatMap((f) => f.row || [f]);
  const form = $('#modalForm');
  form.innerHTML = `
    <h3>${editing ? 'Editar' : 'Novo'}: ${esc(def.title)}</h3>
    ${def.preview ? '<div class="form-preview" id="formPreview"></div>' : ''}
    ${def.fields.map((f) => (f.row ? `<div class="form-row">${f.row.map((x) => wrapField(x, values)).join('')}</div>` : wrapField(f, values))).join('')}
    <div class="error" id="formErr"></div>
    <div class="form-actions">
      ${editing ? '<button type="button" class="btn danger" id="delBtn">Excluir</button>' : ''}
      <div class="right"><button type="button" class="btn" id="cancelBtn">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </div>`;
  const dlg = $('#modal');
  $('#cancelBtn').onclick = () => dlg.close();
  const current = () => {
    const v = { ...values };
    for (const f of flat) { const el = form.elements[f.k]; if (el) v[f.k] = f.type === 'checkbox' ? el.checked : el.value; }
    return v;
  };
  const updatePreview = () => { if (def.preview) $('#formPreview').innerHTML = def.preview(current()); };
  const visible = (f, v) => !f.show || f.show(v);
  const applyVisibility = () => {
    const v = current();
    for (const f of flat) {
      const el = form.querySelector(`[data-field="${f.k}"]`);
      if (!el) continue;
      el.hidden = !visible(f, v);
      const inp = form.elements[f.k];
      if (inp && f.required) inp.required = !el.hidden;
      if (typeof f.label === 'function') { const lb = el.querySelector('label'); if (lb) lb.textContent = fLabel(f, v); }
      if (typeof f.hint === 'function') { const h = el.querySelector('.hint'); if (h) h.textContent = fHint(f, v) || ''; }
    }
    form.querySelectorAll('.form-row').forEach((r) => { r.hidden = [...r.children].every((c) => c.hidden); });
  };
  let presetManual = !!values.preset && editing;
  form.oninput = (e) => {
    if (e.target.name === 'bank' && form.elements.preset && !presetManual) {
      const b = findBank(e.target.value);
      const k = b ? b.slug : '';
      form.elements.preset.value = k;
      form.querySelectorAll('[data-preset]').forEach((x) => x.classList.toggle('on', x.dataset.preset === k));
      if (b) form.querySelector(`[data-preset="${k}"]`)?.scrollIntoView({ block: 'nearest' });
    }
    if (flat.some((f) => f.show || typeof f.label === 'function') && e.target.tagName === 'SELECT') applyVisibility();
    updatePreview();
  };
  form.querySelectorAll('[data-preset]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.preset;
      const p = PRESETS[k];
      presetManual = true;
      form.elements.preset.value = k;
      form.querySelectorAll('[data-preset]').forEach((x) => x.classList.toggle('on', x === b));
      if (p) {
        form.elements.bank.value = p.bank;
        if (name === 'card' && (!form.elements.name.value || Object.values(PRESETS).some((x) => x.tier === form.elements.name.value))) form.elements.name.value = p.tier || '';
        if (name === 'account' && !form.elements.name.value) form.elements.name.value = `Conta ${p.bank}`;
      }
      updatePreview();
    };
  });
  for (const f of flat.filter((x) => x.type === 'image')) {
    const hidden = form.elements[f.k];
    const clear = $(`#f_${f.k}_clear`);
    $(`#f_${f.k}_file`).onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { hidden.value = await imageToDataUrl(file); clear.hidden = false; updatePreview(); } catch (err) { $('#formErr').textContent = err.message; }
    };
    clear.onclick = () => { hidden.value = ''; clear.hidden = true; updatePreview(); };
  }
  applyVisibility();
  updatePreview();
  if (editing) {
    $('#delBtn').onclick = async () => {
      const btn = $('#delBtn');
      if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Confirmar exclusão'; return; }
      await api(`${def.resource}/${record.id}`, { method: 'DELETE' });
      dlg.close(); toast('Excluído'); refresh();
    };
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = {};
    const v = current();
    for (const f of flat) {
      const el = form.elements[f.k];
      body[f.k] = !visible(f, v) ? null : f.type === 'checkbox' ? el.checked : el.value;
    }
    try {
      await api(editing ? `${def.resource}/${record.id}` : def.resource, { method: editing ? 'PUT' : 'POST', body });
      dlg.close(); toast('Salvo'); await refresh();
      if (((name === 'transaction' && body.type === 'entrada' && body.kind === 'normal') || name === 'receive') && !editing && (state.data?.savings || []).length) {
        openDistribute(`Entrou ${money(body.amount)}. Quer guardar uma parte?`, Number(String(body.amount).replace(',', '.')) || 0, body.date);
      }
    } catch (err) { $('#formErr').textContent = err.message; }
  };
  dlg.showModal();
  const first = form.querySelector('input:not([type=checkbox]), select');
  if (first && window.matchMedia('(pointer:fine)').matches) first.focus();
}

// Confirmação dentro da página (sem confirm()/prompt() do navegador).
function askConfirm(title, text, okLabel, typeWord) {
  return new Promise((resolve) => {
    const form = $('#modalForm');
    const dlg = $('#modal');
    form.innerHTML = `<h3>${esc(title)}</h3><p class="muted" style="margin:0">${esc(text)}</p>
      ${typeWord ? `<div class="field"><label for="f_confirm">Digite ${esc(typeWord)} para confirmar</label><input id="f_confirm" autocomplete="off"></div>` : ''}
      <div class="form-actions"><div class="right"><button type="button" class="btn" id="cancelBtn">Cancelar</button><button class="btn primary" type="submit" id="okBtn">${esc(okLabel)}</button></div></div>`;
    let done = false;
    const finish = (v) => { if (done) return; done = true; dlg.close(); resolve(v); };
    $('#cancelBtn').onclick = () => finish(false);
    dlg.addEventListener('close', () => finish(false), { once: true });
    form.onsubmit = (e) => {
      e.preventDefault();
      if (typeWord && $('#f_confirm').value.trim().toUpperCase() !== typeWord) { $('#f_confirm').focus(); return; }
      finish(true);
    };
    dlg.showModal();
  });
}

// Guardar dinheiro nas caixinhas (ao lançar uma entrada ou ao receber o salário).
function openDistribute(title, available = 0, date = null) {
  const list = (state.data?.savings || []);
  const form = $('#modalForm');
  const dlg = $('#modal');
  const dt = date || (state.month === curMonth() ? today() : `${state.month}-01`);
  form.innerHTML = `<h3>${esc(title)}</h3>
    <p class="muted small" style="margin:0">Sugestão = o valor mensal de cada caixinha (ou o que falta para a meta no prazo). Ajuste ou zere o que não quiser guardar agora.</p>
    <div class="rows">${list.map((sv) => `
      <div class="row"><div class="name">${svIcon(sv)}<div style="min-width:0"><b>${esc(sv.name)}</b><div class="muted small">${esc(sv.account || 'sem conta definida')}${sv.deposited ? ' · já guardou este mês' : ''}</div></div></div>
      <input class="dist-in" data-sv="${sv.id}" type="number" step="0.01" inputmode="decimal" value="${sv.deposited ? 0 : (sv.suggested || 0)}" aria-label="Valor para ${esc(sv.name)}"></div>`).join('')}</div>
    <div class="small" id="distTotal"></div>
    <div class="form-actions"><button type="button" class="btn" data-form="saving">+ Nova caixinha</button><div class="right"><button type="button" class="btn" id="cancelBtn">Agora não</button><button class="btn primary" type="submit">Guardar</button></div></div>`;
  const total = () => [...form.querySelectorAll('.dist-in')].reduce((s, i) => s + (Number(i.value) || 0), 0);
  const upd = () => { const t = total(); $('#distTotal').innerHTML = `Total a guardar: <b>${money(t)}</b>${available ? ` · ${pct((t / available) * 100)} da entrada` : ''}`; };
  form.oninput = upd; upd();
  $('#cancelBtn').onclick = () => dlg.close();
  form.onsubmit = async (e) => {
    e.preventDefault();
    for (const i of form.querySelectorAll('.dist-in')) {
      const v = Number(i.value) || 0;
      if (v > 0) await api('reserve', { method: 'POST', body: { savings_id: i.dataset.sv, amount: v, date: dt, note: 'Guardado da entrada' } });
    }
    dlg.close(); toast(`${money(total())} guardado`); refresh();
  };
  if (!dlg.open) dlg.showModal();
}

// Pagar / ajustar uma ocorrência (só este mês; os outros meses ficam iguais).
function openPayItem(it) {
  if (!it) return;
  const form = $('#modalForm'); const dlg = $('#modal');
  const canAdjust = it.type === 'bill' || it.type === 'reminder';
  const when = it.date ? it.date.split('-').reverse().join('/') : `${monthName(state.month).toLowerCase()}`;
  form.innerHTML = `<h3>${esc(it.name)}</h3>
    <p class="muted small" style="margin:0">${it.date ? `Ocorrência de ${when}` : `Vencimento dia ${it.due_day} de ${when}`}${it.base != null ? ` · valor normal ${money(it.base)}` : ''}</p>
    <div class="field"><label for="pi_amount">${it.paid ? 'Valor pago' : 'Valor desta vez'}</label><input id="pi_amount" type="number" step="0.01" inputmode="decimal" value="${it.amount}"><span class="hint">Muda só esta ${it.date ? 'ocorrência' : 'vez'}. Os outros meses continuam com o valor normal.</span></div>
    ${canAdjust ? `<div class="field"><label for="pi_note">Observação</label><input id="pi_note" value="${esc(it.note || '')}" placeholder="Ex.: abatimento pela manutenção, juros por atraso"></div>` : ''}
    <div class="field check-field"><input type="checkbox" id="pi_paid" ${it.paid ? 'checked' : ''}><label for="pi_paid">Já paguei</label></div>
    <div class="error" id="formErr"></div>
    <div class="form-actions">${canAdjust ? `<button type="button" class="btn danger" id="pi_skip">Pular ${it.date ? 'esta vez' : 'este mês'}</button>` : ''}
      <div class="right"><button type="button" class="btn" id="cancelBtn">Cancelar</button><button class="btn primary">Salvar</button></div></div>`;
  $('#cancelBtn').onclick = () => dlg.close();
  const ref = it.type === 'reminder' ? { date: it.date } : { month: state.month };
  const skip = $('#pi_skip');
  if (skip) skip.onclick = async () => {
    if (!skip.dataset.armed) { skip.dataset.armed = '1'; skip.textContent = 'Confirmar: pular'; return; }
    if (it.paid) await api('pay', { method: 'POST', body: { type: it.type, id: it.id, paid: false, ...ref } });
    await api('adjust', { method: 'POST', body: { type: it.type, id: it.id, skip: true, ...ref } });
    dlg.close(); toast('Pulado só desta vez'); refresh();
  };
  form.oninput = null;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const amount = Number(String($('#pi_amount').value).replace(',', '.'));
    if (!(amount >= 0)) { $('#formErr').textContent = 'Valor inválido'; return; }
    const paid = $('#pi_paid').checked;
    try {
      if (canAdjust) await api('adjust', { method: 'POST', body: { type: it.type, id: it.id, amount: amount === it.base ? null : amount, note: $('#pi_note').value, ...ref } });
      if (paid || it.paid) await api('pay', { method: 'POST', body: { type: it.type, id: it.id, paid, amount, ...ref } });
      dlg.close(); toast(paid ? 'Pago' : 'Valor ajustado'); refresh();
    } catch (err) { $('#formErr').textContent = err.message; }
  };
  dlg.showModal();
}

// ---------- notificações ----------
async function loadBell() {
  try {
    const r = await api('notifications');
    state.notifs = r.list;
    const b = $('#bellBadge');
    b.hidden = !r.unread; b.textContent = r.unread > 9 ? '9+' : r.unread;
    if ($('#notifPanel').classList.contains('open')) renderNotifPanel();
  } catch (e) { /* sem login */ }
}
const NOTIF_IC = { conta: 'pagar', lembrete: 'relogio', limite: 'cartoes', saldo: 'banco', salario: 'dinheiro', resumo: 'carteira', suporte: 'acerto', cadastro: 'acerto', servidor: 'banco', receita: 'dinheiro' };
function renderNotifPanel() {
  const list = state.notifs || [];
  $('#notifPanel').innerHTML = `<div class="notif-head"><b>Notificações</b><div style="display:flex;gap:8px"><a class="link-btn" href="#notificacoes">Ajustes</a>${list.some((n) => !n.read) ? '<button class="link-btn" id="readAllBtn">Marcar lidas</button>' : ''}</div></div>
    <div class="notif-list">${list.map((n) => `
      <div class="notif ${n.read ? '' : 'unread'}" data-notif="${n.id}" data-url="${esc(n.url || '')}">
        ${illus(NOTIF_IC[n.kind] || 'carteira', 'notif-ic')}
        <div style="min-width:0;flex:1"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${esc(String(n.created_at).replace(' ', 'T').slice(5, 16).replace('T', ' ').split(' ').map((x, i) => (i === 0 ? x.split('-').reverse().join('/') : x)).join(' '))}</small>
        ${n.action && !n.read ? `<div style="margin-top:6px"><button class="btn sm primary" data-notif-pay="${n.id}">Paguei</button></div>` : ''}</div>
      </div>`).join('') || '<div class="empty">Nenhuma notificação ainda</div>'}</div>`;
}

// Push no celular (precisa do app instalado/https)
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !window.__bootDemo;
async function enablePush() {
  const reg = await navigator.serviceWorker.register('sw.js');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permissão negada. Libere as notificações do site nas configurações do navegador.');
  const { vapid } = await api('notify-prefs');
  const key = Uint8Array.from(atob(vapid.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((vapid.length + 3) % 4)), (c) => c.charCodeAt(0));
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const ua = navigator.userAgent;
  const device = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Navegador';
  await api('push/subscribe', { method: 'POST', body: { ...sub.toJSON(), device } });
}

// ---------- ações ----------
async function togglePay(type, id, paid, date) {
  await api('pay', { method: 'POST', body: { type, id, paid, month: state.month, date: date || undefined } });
  refresh();
}

// ---------- telas ----------
function viewVisao(d) {
  const b = d.balance;
  const parts = [
    { label: d.view === 'casal' ? 'Contas da casa' : 'Sua parte da casa', v: b.my_house_share, color: 'var(--navy)' },
    { label: 'Contas pessoais', v: b.personal, color: 'var(--blue)' },
    { label: 'Guardar', v: b.saving || 0, color: '#14b8a6' },
    { label: 'Dia a dia', v: b.daily, color: 'var(--line)' },
    { label: 'Sobra', v: Math.max(0, b.leftover), color: 'var(--green)' },
  ];
  const base = Math.max(b.income, parts.reduce((s, p) => s + p.v, 0)) || 1;

  // Contas a pagar
  const days = [...new Set(d.to_pay.items.map((i) => i.due_day))];
  const now = new Date();
  const nextDue = d.to_pay.items.find((i) => !i.paid);
  let daysTxt = '';
  if (nextDue) {
    const [y, m] = d.month.split('-').map(Number);
    const diff = Math.round((new Date(y, m - 1, nextDue.due_day) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
    daysTxt = diff > 0 ? `em ${diff} dias` : diff === 0 ? 'vence hoje' : `venceu há ${-diff} dias`;
  }
  const filter = days.includes(state.dueFilter) ? state.dueFilter : null;
  const items = filter ? d.to_pay.items.filter((i) => i.due_day === filter) : d.to_pay.items;

  // Divisão
  const h = d.house;
  const meShare = h.total ? (h.my_share / h.total) * 100 : 50;
  const settleTxt = h.settlement > 0.009
    ? `${avatar(d.other)} → ${avatar(d.me)} <span>${esc(d.other.name)} te devolve <b>${money(h.settlement)}</b> no Pix</span>`
    : h.settlement < -0.009
      ? `${avatar(d.me)} → ${avatar(d.other)} <span>Você devolve <b>${money(-h.settlement)}</b> para ${esc(d.other.name)}</span>`
      : '<span>Tudo certo, ninguém deve ninguém</span>';

  // Cartões
  const cards = d.cards;
  const ci = Math.min(state.cardIdx, Math.max(0, cards.length - 1));
  const card = cards[ci];

  // Moradia
  const hm = d.housing;
  const hv = state.housingMode === 'meu' ? hm.my_total : hm.couple_total;
  const hp = state.housingMode === 'meu' ? hm.my_pct : hm.couple_pct;
  const scale = Math.max(60, Math.ceil(hp / 10) * 10);
  const okHousing = hp <= hm.ref;

  // Sistema recém-instalado: guia de primeiros passos no lugar de números vazios.
  const steps = [
    { done: (d.me.salary || 0) > 0 || (d.to_receive?.items || []).length > 0, title: 'Informe sua renda', text: 'Salário líquido de cada pessoa da casa.', href: '#renda', btn: 'Nossa renda' },
    { done: (d.accounts?.list || []).length > 0, title: 'Cadastre sua conta bancária', text: 'Onde cai o salário e de onde sai o Pix.', form: 'account', btn: '+ Conta bancária' },
    { done: d.to_pay.items.some((i) => i.type === 'bill'), title: 'Cadastre as contas fixas', text: 'Aluguel, luz, internet… as que se repetem todo mês.', form: 'bill', btn: '+ Conta fixa' },
    { done: d.cards.length > 0, title: 'Cadastre seus cartões', text: 'Com limite e vencimento; a cor do banco vem sozinha.', form: 'card', btn: '+ Cartão' },
    { done: d.people.length > 1, title: 'Convide quem divide a casa', text: 'Crie o acesso da outra pessoa para dividir as contas.', href: '#acessos', btn: 'Acessos', perm: 'manage_users' },
  ].filter((x) => !x.perm || can(x.perm));
  const pending = steps.filter((x) => !x.done).length;
  const startGuide = pending >= 3 ? `
    <section class="panel start-guide">
      <div class="panel-head"><div><h2>Primeiros passos</h2><p class="muted small" style="margin:4px 0 0">Preencha o básico e o painel começa a calcular seu saldo, a divisão da casa e o que dá para gastar por dia.</p></div>${illus('carteira')}</div>
      <ol class="steps-list">${steps.map((x) => `<li class="${x.done ? 'done' : ''}"><span class="step-dot">${x.done ? I.check : ''}</span><div style="min-width:0;flex:1"><b>${x.title}</b><small>${x.text}</small></div>${x.done ? '<span class="pill green">feito</span>' : x.href ? `<a class="btn sm" href="${x.href}">${x.btn}</a>` : `<button class="btn sm primary" data-form="${x.form}">${x.btn}</button>`}</li>`).join('')}</ol>
    </section>` : '';

  const myPid = state.user?.person_id;
  const who = state.viewWho || myPid;
  const viewChips = (d.people || []).length > 1 ? `<div class="view-who" role="group" aria-label="Ver o painel de">
    <span class="muted small">Ver painel de</span>
    ${d.people.map((p) => `<button class="chip ${who === p.id ? 'on' : ''}" data-view-who="${p.id}">${esc(p.name.split(' ')[0])}${p.id === myPid ? ' (você)' : ''}</button>`).join('')}
    <button class="chip ${who === 'casal' ? 'on' : ''}" data-view-who="casal">Casal</button>
    ${help('verpainel')}</div>` : '';
  return `${viewChips}${startGuide}
  <div class="dash">
    <section class="panel a-saldo">
      <div class="panel-head">
        <div>
          <h2>Saldo previsto ${help('saldo')}</h2>
          <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
            ${big(b.leftover, 'xl')}
            <div class="small"><div class="${{ feliz: 'good', preocupado: 'warn', triste: 'neg' }[moodOf(b)]}">${b.leftover >= 0 ? '↗' : '↘'} ${pct(b.leftover_pct)} da renda livre</div><div class="muted">o que sobra depois de pagar tudo</div></div>
          </div>
        </div>
        ${mascot(moodOf(b))}
      </div>
      <div class="stackbar">${parts.map((p) => `<span style="flex:${Math.max(p.v, 0) / base};background:${p.color}"></span>`).join('')}</div>
      <div class="legend">
        <div><small>Renda do mês</small><b>${money(b.income)}</b>${d.to_receive?.remaining ? `<span class="pct">· falta receber ${money(d.to_receive.remaining)}</span>` : ''}</div>
        ${parts.map((p, i) => `<div><small><span class="dot" style="background:${p.color}"></span>${p.label}</small><b class="${i === parts.length - 1 ? (b.leftover < 0 ? 'neg' : 'good') : ''}">${i < parts.length - 1 ? '− ' : ''}${money(i === parts.length - 1 ? b.leftover : p.v)}</b> ${b.income ? `<span class="pct">· ${pct((p.v / b.income) * 100)}</span>` : ''}</div>`).join('')}
      </div>
      <div class="quick">
        <a href="#fluxo" class="q">${illus('diaadia', 'q-ic')}<div><small class="q-t">Dia a dia ${help('diaadia')}</small><b>${money(b.daily_spent)}</b><div class="progress"><span style="width:${Math.min(100, (b.daily_spent / (d.settings.daily_budget || 1)) * 100)}%;background:${b.daily_spent > d.settings.daily_budget ? 'var(--red)' : 'var(--blue)'}"></span></div><small>de ${money(d.settings.daily_budget)}</small></div></a>
        <a href="#reserva" class="q">${illus('poupanca', 'q-ic')}<div><small>Poupança</small><b>${money(d.reserve.balance)}</b>${d.reserve.goal ? `<div class="progress"><span style="width:${Math.min(100, (d.reserve.balance / d.reserve.goal) * 100)}%"></span></div><small>meta ${money(d.reserve.goal)}</small>` : ''}</div></a>
        <a href="#fluxo" class="q">${illus('renda', 'q-ic')}<div><small>Renda extra</small><b class="good">${money(b.extra_income)}</b></div></a>
        <a href="#casa" class="q">${illus('acerto', 'q-ic')}<div><small class="q-t">Acerto ${help('acerto')}</small><b>${money(Math.abs(d.house.settlement))}</b><small>${d.house.settlement > 0.009 ? `${esc(d.other.name)} → você` : d.house.settlement < -0.009 ? `você → ${esc(d.other.name)}` : 'em dia'}${d.house.settled ? ' · feito' : ''}</small></div></a>
      </div>
    </section>

    <section class="panel a-cred">
      <div class="cred-grid three">
        <div>
          <h2>Saldo em contas ${help('contas')}</h2>
          ${big(d.accounts.my_balance, 'lg')}
          <div class="debt-rows">
            ${d.daily ? `<div class="debt-row"><span>Livre por dia ${help('livre')}</span><b class="${d.daily.allowance < 0 ? 'neg' : 'good'}">${money(Math.max(0, d.daily.allowance))}</b></div>` : ''}
            <div class="debt-row"><span class="muted">Fim do mês ${help('fimmes')}</span><b class="${d.accounts.my_projected < 0 ? 'neg' : ''}">${money(d.accounts.my_projected)}</b></div>
            ${d.daily ? `<div class="debt-row"><span class="muted">Média/dia ${help('media')}</span><span class="small nowrap"><span class="good">+${money(d.daily.in_per_day)}</span> · −${money(d.daily.out_per_day)}</span></div>` : ''}
          </div>
          ${d.accounts.alerts.map((a) => `<div class="alert-bad small">${I.alert} ${esc(a.name)} fica negativa (${money(a.amount)}) dia ${a.date.slice(8)}</div>`).join('')}
          <div class="cred-cards">${d.accounts.list.filter((a) => a.owner_id === d.me.id || a.owner_id == null).map((a) => `<a href="#bancarias" class="cred-card"><span class="sw" style="background:${PRESETS[a.preset]?.bg || esc(a.color || '#16a34a')}"></span><div style="min-width:0;flex:1" class="row"><span class="small" style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</span><span class="small"><b>${money(a.balance)}</b></span></div></a>`).join('') || '<a href="#bancarias" class="small">+ Cadastrar conta bancária</a>'}</div>
        </div>
        <div class="cred-mid">
          <h2>Crédito disponível ${help('credito')}</h2>
          ${big(d.credit.free, 'lg')}
          <div class="muted small">livre de ${money(d.credit.limit)} de limite</div>
          <div class="progress" style="height:8px"><span style="width:${d.credit.used_pct}%;background:${d.credit.used_pct > 80 ? 'var(--red)' : d.credit.used_pct > 50 ? 'var(--amber)' : 'var(--blue)'}"></span></div>
          <div class="muted small">${pct(d.credit.used_pct)} usado · valores = limite livre</div>
          <div class="cred-cards">${d.credit.cards.map((c) => {
            const p = PRESETS[c.preset];
            const u = c.limit ? Math.min(100, (c.used / c.limit) * 100) : 0;
            return `<a href="#cartoes" class="cred-card"><span class="sw" style="background:${p ? p.bg : esc(c.color || '#1f2937')}"></span><div style="min-width:0;flex:1"><div class="row" style="border:0;padding:0"><span class="small" style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span><span class="small nowrap"><b>${money(c.free)}</b></span></div><div class="progress" style="height:5px;margin:4px 0 0"><span style="width:${u}%;background:var(--blue)"></span></div></div></a>`;
          }).join('') || '<div class="muted small">Cadastre seus cartões para ver o limite.</div>'}</div>
        </div>
        <div class="cred-debt">
          <h2>Dívida total ${help('divida')}</h2>
          ${big(d.credit.debt.total, 'lg')}
          <div class="muted small">tudo que falta pagar${d.credit.debt.end_month ? ` · empréstimos até ${monthShort(d.credit.debt.end_month)}` : ''}</div>
          <div class="debt-rows">
            <a href="#emprestimos" class="debt-row"><span><span class="dot" style="background:var(--navy)"></span> Empréstimos</span><b>${money(d.credit.debt.loans)}</b></a>
            <a href="#cartoes" class="debt-row"><span><span class="dot" style="background:var(--blue)"></span> Cartões</span><b>${money(d.credit.debt.cards)}</b></a>
            <div class="debt-row"><span class="muted">Por mês</span><b>${money(d.credit.debt.monthly)}</b></div>
          </div>
          ${d.credit.debt.total ? `<div class="stackbar" style="margin:10px 0 0"><span style="flex:${d.credit.debt.loans};background:var(--navy)"></span><span style="flex:${d.credit.debt.cards};background:var(--blue)"></span></div>` : ''}
        </div>
      </div>
    </section>

    <section class="panel a-pagar">
      <div class="panel-head">
        <div>
          <h2>Contas a pagar ${help('pagar')} <span class="muted">${nextDue ? `· dia ${String(nextDue.due_day).padStart(2, '0')}` : ''}</span></h2>
          ${big(d.to_pay.total, 'lg')}
          <div class="muted small">${daysTxt ? `${daysTxt} · ` : ''}${d.to_pay.paid_count} de ${d.to_pay.count} pagas</div>
        </div>
        ${illus('pagar')}
      </div>
      <div class="chips">${days.slice(0, 5).map((day) => {
        const its = d.to_pay.items.filter((i) => i.due_day === day);
        return `<button class="chip ${filter === day ? 'on' : ''}" data-due="${day}">${String(day).padStart(2, '0')}<small>${its.map((i) => (i.paid ? '●' : '○')).join('')}</small></button>`;
      }).join('')}</div>
      <div class="rows">${items.map((i) => `
        <div class="row ${i.paid ? 'done' : ''}">
          <div class="name"><button class="check ${i.paid ? 'on' : ''}" data-pay="${i.type}:${i.id}:${i.paid ? 0 : 1}:${i.date || ''}" aria-label="Marcar pago">${i.paid ? I.check : ''}</button><button class="link-plain" data-payitem="${i.type}:${i.id}:${i.date || ''}" title="Pagar com outro valor, ajustar só este mês ou pular">${esc(i.name)}${i.adjusted ? ' <span class="pill amber">ajustado</span>' : ''}</button></div>
          <div class="val">${money(i.amount)}</div>
        </div>`).join('') || '<div class="empty">Nenhuma conta neste mês</div>'}
      </div>
    </section>

    <section class="panel a-receber">
      <div class="panel-head"><div>
        <h2>A receber ${help('receber')}</h2>
        ${big(d.to_receive?.remaining || 0, 'lg')}
        <div class="muted small">${d.to_receive?.items?.length ? `recebido ${money(d.to_receive.received)} de ${money(d.to_receive.expected)}` : 'Cadastre contratos, salário e benefícios em Receitas'}</div>
      </div>${illus('renda')}</div>
      <div class="rows">${(d.to_receive?.items || []).slice(0, 6).map((i) => { const st = INC_STATUS[i.status] || INC_STATUS.previsto; return `
        <div class="row ${i.status === 'recebido' ? 'done' : ''}">
          <div class="name"><span class="st-ic st-${i.status}" title="${st[2]}">${st[0]}</span><button class="link-plain" style="text-align:left;min-width:0" ${i.status === 'recebido' ? 'data-goto="receitas"' : `data-receive="${i.id}"`}>${esc(i.name)}<span class="muted small" style="display:block">${[i.parts > 1 ? `${i.parts_received}/${i.parts} recebido` : '', i.due ? `dia ${i.due.slice(8)}/${i.due.slice(5, 7)}` : '', i.status === 'atrasado' ? 'atrasado' : ''].filter(Boolean).join(' · ')}</span></button></div>
          <div class="val">${money(i.status === 'recebido' ? i.received : i.remaining || i.expected)}</div>
        </div>`; }).join('') || `<div class="empty"><a class="btn sm" href="#receitas">Abrir Receitas</a></div>`}</div>
    </section>

    <section class="panel a-casa">
      <div class="panel-head">
        <div><h2>Divisão da casa ${help('casa')}</h2><div class="muted small">Total das contas</div>${big(h.total, 'lg')}</div>
        ${illus('casa')}
      </div>
      <div class="split-head" style="margin-top:14px">
        <div><small><span class="dot" style="background:${esc(d.me.color)}"></span>Você paga</small><b>${money(h.my_share)}</b></div>
        <div style="text-align:right"><small style="justify-content:flex-end">${esc(d.other.name)} paga<span class="dot" style="background:${esc(d.other.color)}"></span></small><b>${money(h.other_share)}</b></div>
      </div>
      <div class="split-bar"><span style="width:${meShare}%;background:${esc(d.me.color)}">${meShare.toFixed(1).replace('.', ',')}%</span><span style="width:${100 - meShare}%;background:${esc(d.other.color)}">${(100 - meShare).toFixed(1).replace('.', ',')}%</span><i style="left:calc(${meShare}% - 1px)"></i></div>
      <div class="small" style="font-weight:700;margin-bottom:4px">Quem paga cada conta</div>
      <div class="rows">${h.bills.map((x) => {
        const p = d.people.find((pp) => pp.id === x.owner_id);
        return `<div class="row clickable" data-edit-bill="${x.id}"><div class="name"><span class="dot" style="background:${esc(p?.color || '#94a3b8')}"></span><span>${esc(x.name)}</span></div><div class="val">${money(x.amount)}</div></div>`;
      }).join('') || '<div class="empty">Cadastre as contas da casa</div>'}</div>
      <div class="settle"><div style="display:flex;align-items:center;gap:6px">${illus('acerto', 'settle-ic')}${settleTxt}</div>${Math.abs(h.settlement) > 0.009 ? `<button class="btn sm" id="settleBtn">${h.settled ? `${I.check} Feito` : 'Marcar feito'}</button>` : ''}</div>
    </section>

    <section class="panel a-cartoes">
      <div class="panel-head">
        <div><h2>Cartões ${help('cartoes')}</h2>${card ? `<div class="muted small">Fatura de ${monthName(d.month).toLowerCase()}</div>${big(card.invoice, 'lg')}` : '<div class="muted small">Nenhum cartão cadastrado</div>'}</div>
        ${illus('cartoes')}
      </div>
      ${card ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0">
        <button class="btn sm" data-goto="cartoes">Ver fatura</button>
        <div style="display:flex;gap:4px"><button class="icon-btn ghost" data-card-step="-1" aria-label="Cartão anterior">${I.chevL}</button><button class="icon-btn" data-card-step="1" aria-label="Próximo cartão">${I.chevR}</button></div>
      </div>
      <div class="card-carousel" id="carousel">${cards.map((c, i) => cardVisual(c, { sel: i === ci, month: d.month, attrs: `data-card-idx="${i}"` })).join('')}
      </div>
      <div class="label-caps">Próximas faturas</div>
      ${invoiceCols(card.next)}` : '<button class="btn" data-form="card">+ Cadastrar cartão</button>'}
    </section>

    <section class="panel a-moradia">
      <div class="panel-head">
        <div><h2>Moradia ${help('moradia')}</h2><div class="muted small">Quanto ${state.housingMode === 'meu' ? 'você gasta' : 'o casal gasta'} pra morar</div>${big(hv, 'lg')}</div>
        ${illus('moradia')}
      </div>
      <div class="small" style="margin-top:6px"><span class="${okHousing ? 'good' : 'neg'}">${okHousing ? I.check : I.alert} ${pct(hp)} do salário</span> <span class="muted">referência: até ${hm.ref}%</span></div>
      <div class="tabs"><button data-hmode="meu" class="${state.housingMode === 'meu' ? 'on' : ''}">Só meu salário</button><button data-hmode="casal" class="${state.housingMode === 'casal' ? 'on' : ''}">Salário do casal</button></div>
      <div class="gauge"><span style="width:${Math.min(100, (hp / scale) * 100)}%;background:${okHousing ? 'var(--green)' : 'var(--red)'}"></span><i style="left:${(hm.ref / scale) * 100}%"></i><em style="left:${(hm.ref / scale) * 100}%">${hm.ref}%</em></div>
      <div class="gauge-scale"><span>0%</span><span>${scale}% do salário</span></div>
      <div class="small" style="font-weight:700;margin:16px 0 10px">O que entra na conta</div>
      <div class="mini-grid">${hm.items.map((x) => `<div class="mini">${illus('casinha', 'ic')}<div style="min-width:0"><small>${esc(x.name)}</small><b>${money(state.housingMode === 'meu' ? x.amount : x.amount / ((d.share_me || 50) / 100))}</b></div></div>`).join('') || '<div class="muted small">Marque contas como “moradia” em Contas.</div>'}</div>
    </section>

    <section class="panel a-emp">
      <div class="panel-head"><div><h2>Empréstimos ${help('emprestimos')}</h2><div class="muted small">Saldo devedor</div>${big(d.loans.reduce((s, l) => s + l.balance, 0), 'lg')}</div>${illus('emprestimos')}</div>
      <div class="rows" style="margin-top:8px">${d.loans.map((l) => `
        <a class="loan-row" href="#emprestimos">
          <div class="row" style="border:0;padding-bottom:4px"><div class="name"><b>${esc(l.name)}</b><span class="muted small">${esc(l.lender || '')}</span></div><span class="val">${l.done}/${l.installments}</span></div>
          <div class="progress" style="margin:0 0 4px"><span style="width:${l.pct}%"></span></div>
          <div class="muted small">${l.next ? `Próxima: nº ${l.next.no} · ${monthShort(l.next.month)} · ${money(l.installment)}` : 'Quitado'} · termina ${monthShort(l.end_month)}</div>
        </a>`).join('') || '<div class="empty">Nenhum empréstimo</div>'}</div>
      <div style="margin-top:12px"><button class="btn sm" data-form="loan">+ Empréstimo</button></div>
    </section>

    <section class="panel a-poup">
      <div class="panel-head"><div><h2>Poupança ${help('poupanca')}</h2><div class="muted small">Guardado nas caixinhas</div>${big(d.reserve.balance, 'lg')}</div>${illus('poupanca')}</div>
      <div class="rows" style="margin-top:8px">${d.savings.map((sv) => `
        <a class="loan-row" href="#reserva">
          <div class="row" style="border:0;padding-bottom:4px"><div class="name">${svIcon(sv)}<b>${esc(sv.name)}</b></div><span class="val">${money(sv.balance)}</span></div>
          ${sv.goal ? `<div class="progress" style="margin:0 0 4px"><span style="width:${sv.pct}%;background:${esc(sv.color || 'var(--green)')}"></span></div>` : ''}
          <div class="muted small">${sv.goal ? `${pct(sv.pct)} de ${money(sv.goal)}` : 'sem meta'}${sv.suggested ? ` · ${money(sv.suggested)}/mês` : ''}${sv.deposited ? ` · ${I.check} guardado no mês` : ''}</div>
        </a>`).join('')}</div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm primary" id="distBtn">Recebi o salário: guardar</button><button class="btn sm" data-form="saving">+ Caixinha</button></div>
    </section>

    <section class="panel a-bens">
      <div class="panel-head"><div><h2>Patrimônio ${help('patrimonio')}</h2><div class="muted small">bens + contas + poupança − dívidas</div>${big(d.networth.total, 'lg')}</div>${illus('moradia')}</div>
      <div class="rows" style="margin-top:8px">${d.assets.list.map((a) => `<a class="loan-row" href="#bens"><div class="row" style="border:0;padding-bottom:2px"><div class="name">${illus(assetIcon(a.kind), 'sv-ic')}<b>${esc(a.name)}</b></div><span class="val">${money(a.market_value || 0)}</span></div><div class="muted small">${a.to_pay ? `falta pagar ${money(a.to_pay)} · ` : ''}líquido ${money(a.net)}${a.change != null ? ` · ${a.change >= 0 ? I.up : I.down} ${Math.abs(Math.round(a.change_pct))}%` : ''}</div></a>`).join('') || '<div class="muted small">Cadastre seu carro, casa ou lote.</div>'}</div>
      <div style="margin-top:10px"><button class="btn sm" data-form="asset">+ Bem</button></div>
    </section>

    <section class="panel a-proj">
      <div class="page-head"><h2>Projetos e obras ${help('projetos')}</h2><button class="btn sm" data-form="project">+ Projeto</button></div>
      <div class="rows" style="margin-top:6px">${d.projects.map((p) => `
        <div class="row clickable" data-edit-project="${p.id}">
          <div class="name">${illus('projetos', 'q-ic')}<div style="min-width:0"><b>${esc(p.name)}</b><div class="muted small">${esc(p.description || '')}</div></div></div>
          <div style="text-align:right"><div class="val">≈ ${money(p.monthly_amount)}</div><span class="pill ${p.status === 'pago' ? 'green' : p.status === 'confirmado' ? 'blue' : 'amber'}">${esc(p.status)}</span></div>
        </div>`).join('') || '<div class="empty">Nenhum projeto neste mês</div>'}
      </div>
    </section>
  </div>`;
}

function invoiceCols(next) {
  const max = Math.max(...next.map((n) => n.total), 1);
  const pts = next.map((n, i) => [((i + 0.5) / next.length) * 100, 96 - (n.total / max) * 36]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  return `<div class="inv-cols">
    ${next.map((n, i) => `<div class="inv-col ${i === 0 ? 'cur' : ''}"><div><b>${monthShort(n.month)}</b>${i === 0 ? '<div><span class="pill blue">Atual</span></div>' : ''}</div><div class="v">${money(n.total)}</div></div>`).join('')}
    <svg class="inv-line" viewBox="0 0 100 130" preserveAspectRatio="none">
      <path d="${path}" fill="none" stroke="var(--soft)" stroke-width="1.2" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>
    </svg>
    ${pts.map((p, i) => `<span class="inv-dot ${i === 0 ? 'cur' : ''}" style="left:${p[0]}%;top:${(p[1] / 130) * 100}%"></span>`).join('')}
  </div>`;
}

async function viewFluxo(d) {
  const [tx, flow] = await Promise.all([api(`transactions?month=${state.month}`), api(`cashflow?month=${state.month}&n=6`)]);
  const ins = tx.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
  const outs = tx.filter((t) => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
  const max = Math.max(...flow.flatMap((f) => [f.income, f.expenses]), 1);
  const byCat = {};
  tx.filter((t) => t.type === 'saida').forEach((t) => { byCat[t.category || 'Outros'] = (byCat[t.category || 'Outros'] || 0) + t.amount; });
  return `
  <div class="grid-3">
    <div class="panel stat stat-ic">${illus('renda', 'q-ic')}<small>Entradas extras no mês</small><b class="good">${money(ins)}</b></div>
    <div class="panel stat stat-ic">${illus('diaadia', 'q-ic')}<small>Gastos do dia a dia</small><b>${money(outs)}</b><div class="muted small">orçamento: ${money(d.settings.daily_budget)}</div></div>
    <div class="panel stat"><small>Saldo previsto</small><b class="${d.balance.leftover < 0 ? 'neg' : ''}">${money(d.balance.leftover)}</b></div>
  </div>
  <section class="panel">
    <h2>Últimos 6 meses <span class="muted">· renda × saídas</span></h2>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;align-items:end;height:180px">
      ${flow.map((f) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end" title="Renda ${money(f.income)} · Saídas ${money(f.expenses)}">
        <div style="display:flex;gap:4px;align-items:end;height:100%;width:100%;justify-content:center">
          <span style="width:30%;max-width:22px;height:${(f.income / max) * 100}%;background:var(--blue);border-radius:6px 6px 2px 2px"></span>
          <span style="width:30%;max-width:22px;height:${(f.expenses / max) * 100}%;background:var(--navy);opacity:.45;border-radius:6px 6px 2px 2px"></span>
        </div>
        <small class="muted">${monthShort(f.month)}</small>
      </div>`).join('')}
    </div>
    <div class="small muted" style="margin-top:8px"><span class="dot" style="background:var(--blue)"></span> renda &nbsp; <span class="dot" style="background:var(--navy);opacity:.45"></span> saídas</div>
  </section>
  <div class="grid-2">
    <section class="panel">
      <div class="page-head"><h2>Lançamentos de ${monthName(state.month).toLowerCase()}</h2><button class="btn sm primary" data-form="transaction">+ Lançamento</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th></tr></thead>
        <tbody>${tx.map((t) => `<tr class="clickable" data-edit-tx="${t.id}"><td>${t.date.slice(8, 10)}/${t.date.slice(5, 7)}</td><td>${esc(t.description)}</td><td class="muted">${esc(t.category || '')}</td><td class="r ${t.type === 'entrada' ? 'good' : ''}">${t.type === 'entrada' ? '+' : '−'} ${money(t.amount)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Sem lançamentos</td></tr>'}</tbody>
      </table></div>
    </section>
    <section class="panel">
      <h2>Gastos por categoria</h2>
      <div class="rows">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
        <div><div class="row" style="border:0;padding-bottom:2px"><span>${esc(c)}</span><span class="val">${money(v)}</span></div><div class="progress" style="margin-top:2px"><span style="width:${(v / outs) * 100}%;background:var(--blue)"></span></div></div>`).join('') || '<div class="empty">Sem gastos</div>'}</div>
    </section>
  </div>`;
}

function viewCartoes(d) {
  return `
  <div class="page-head"><h2></h2><div style="display:flex;gap:8px"><button class="btn" data-form="card">+ Cartão</button><button class="btn primary" data-form="purchase">+ Compra</button></div></div>
  ${d.cards.map((c) => `
  <section class="panel">
    <div class="panel-head">
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;min-width:0">
        ${cardVisual(c, { month: d.month, cls: 'page-card', attrs: `data-edit-card="${c.id}" title="Editar cartão"` })}
        <div style="min-width:0"><h2 style="margin:0">${esc(c.bank || '')} ${esc(c.name)}</h2><div class="muted small">Fecha dia ${c.closing_day} · vence dia ${c.due_day}${c.kind === 'multiplo' ? ' · débito e crédito' : ''}</div>${c.account_id ? `<div class="small" style="margin-top:2px">${c.auto_debit ? '<span class="pill blue">débito automático</span>' : '<span class="pill gray">vinculado</span>'} ${esc((state.data.accounts?.list || []).find((a) => a.id === c.account_id)?.name || '')}</div>` : ''}<div class="muted small">Limite livre ${money(c.free_limit)} de ${money(c.limit_total)}</div><button class="link-btn" data-edit-card="${c.id}" style="margin-top:6px">Editar cartão</button></div>
      </div>
      <div style="text-align:right">${big(c.invoice, 'md')}<button class="btn sm" data-pay="card:${c.id}:${c.paid ? 0 : 1}" style="margin-top:6px">${c.paid ? `${I.check} Paga` : 'Marcar paga'}</button></div>
    </div>
    <div class="table-wrap" style="margin-top:10px"><table>
      <thead><tr><th>Compra</th><th>Parcela</th><th class="r">Valor no mês</th><th class="r">Total</th></tr></thead>
      <tbody>${c.items.map((i) => `<tr class="clickable" ${i.subscription_id ? `data-edit-subscription="${i.subscription_id}"` : `data-edit-purchase="${i.id}"`}><td>${esc(i.description)}</td><td class="muted">${i.installment}/${i.installments}</td><td class="r">${money(i.value)}</td><td class="r muted">${money(i.total)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Fatura vazia neste mês</td></tr>'}</tbody>
    </table></div>
    <div class="label-caps">Próximas faturas</div>
    ${invoiceCols(c.next)}
  </section>`).join('') || '<section class="panel empty">Nenhum cartão. Clique em “+ Cartão”.</section>'}`;
}

function viewCasa(d) {
  const h = d.house;
  return `
  <div class="grid-3">
    <div class="panel stat stat-ic">${illus('casa', 'q-ic')}<small>Total da casa</small><b>${money(h.total)}</b></div>
    <div class="panel stat"><small>${esc(d.me.name)} (${fmt(d.share_me)}%)</small><b>${money(h.my_share)}</b></div>
    <div class="panel stat"><small>${esc(d.other.name)} (${fmt(100 - d.share_me)}%)</small><b>${money(h.other_share)}</b></div>
  </div>
  <section class="panel">
    <div class="page-head"><h2>Contas da casa · divisão ${d.settings.split_mode === 'igual' ? 'meio a meio' : 'proporcional à renda'}</h2><button class="btn sm primary" data-form="bill">+ Conta</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Conta</th><th>Quem paga</th><th class="r">Valor</th><th class="r">Parte ${esc(d.me.name)}</th><th class="r">Parte ${esc(d.other.name)}</th></tr></thead>
      <tbody>${h.bills.map((b) => {
        const p = d.people.find((x) => x.id === b.owner_id);
        const mine = b.amount * (d.share_me / 100);
        return `<tr class="clickable" data-edit-bill="${b.id}"><td>${esc(b.name)}</td><td><span class="dot" style="background:${esc(p?.color || '#999')}"></span> ${esc(p?.name || '—')}</td><td class="r">${money(b.amount)}</td><td class="r">${money(mine)}</td><td class="r">${money(b.amount - mine)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="settle" style="margin-top:12px"><div style="display:flex;align-items:center;gap:8px">${illus('acerto', 'settle-ic')}<span>${h.settlement > 0.009 ? `${esc(d.other.name)} te devolve <b>${money(h.settlement)}</b>` : h.settlement < -0.009 ? `Você devolve <b>${money(-h.settlement)}</b> para ${esc(d.other.name)}` : 'Contas equilibradas'}</span></div>${Math.abs(h.settlement) > 0.009 ? `<button class="btn sm" id="settleBtn">${h.settled ? `${I.check} Feito` : 'Marcar feito'}</button>` : ''}</div>
  </section>`;
}

async function viewReserva(d) {
  const moves = await api('reserve');
  const sel = state.savingFilter || 0;
  const list = sel ? moves.filter((m) => (m.savings_id || 1) === sel) : moves;
  const svName = (id) => d.savings.find((x) => x.id === (id || 1));
  return `
  <section class="panel">
    <div class="page-head">
      <div style="display:flex;gap:16px;align-items:center">${illus('poupanca', 'illus lg')}<div><h2>Poupança</h2>${big(d.reserve.balance, 'xl')}<div class="muted small">${d.reserve.month ? `${d.reserve.month > 0 ? '+' : ''}${money(d.reserve.month)} em ${monthName(state.month).toLowerCase()}` : 'sem movimento neste mês'}</div></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="distBtn">Recebi o salário: guardar</button><button class="btn" data-form="reserve">Guardar / retirar</button><button class="btn" data-form="saving">+ Caixinha</button></div>
    </div>
  </section>
  <div class="sv-grid">${d.savings.map((sv) => `
    <section class="panel sv-card">
      <div class="panel-head"><div style="min-width:0"><h2 style="margin:0;display:flex;align-items:center;gap:8px">${svIcon(sv, 'sv-ic lg')} ${esc(sv.name)}</h2><div class="muted small">${esc(sv.account || 'Onde fica? Clique em editar')}</div></div><button class="link-btn" data-edit-saving="${sv.id}">Editar</button></div>
      ${big(sv.balance, 'md')}
      ${sv.goal ? `<div class="progress"><span style="width:${sv.pct}%;background:${esc(sv.color || 'var(--green)')}"></span></div>
        <div class="small muted">${pct(sv.pct)} de ${money(sv.goal)} · faltam ${money(Math.max(0, sv.goal - sv.balance))}${sv.target_month ? ` até ${monthShort(sv.target_month)}` : ''}</div>` : '<div class="small muted">Sem meta: guarde quando quiser.</div>'}
      <div class="sv-facts">
        <div><small>Por mês</small><b>${sv.suggested ? money(sv.suggested) : '—'}</b>${!sv.monthly && sv.suggested ? '<small>calculado pela meta</small>' : ''}</div>
        <div><small>Este mês</small><b class="${sv.deposited ? 'good' : ''}">${sv.deposited ? `${I.check} guardado` : sv.suggested ? `dia ${sv.day}` : '—'}</b></div>
        <div><small>Chega na meta</small><b>${sv.months_to_goal ? monthShort(addMonths(state.month, sv.months_to_goal - (sv.deposited ? 0 : 1))) : sv.goal && sv.balance >= sv.goal ? 'Meta batida' : '—'}</b></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">${sv.suggested ? `<button class="btn sm ${sv.deposited ? '' : 'primary'}" data-pay="saving:${sv.id}:${sv.deposited ? 0 : 1}">${sv.deposited ? 'Desfazer depósito do mês' : `Guardar ${money(sv.suggested)} agora`}</button>` : ''}<button class="btn sm" data-sv-filter="${sv.id}">Ver movimentos</button></div>
    </section>`).join('')}</div>
  <section class="panel">
    <div class="page-head"><h2>Movimentos ${sel ? `· ${esc(svName(sel)?.name || '')}` : ''}</h2>${sel ? '<button class="btn sm" data-sv-filter="0">Ver todos</button>' : ''}</div>
    <div class="table-wrap"><table><thead><tr><th>Data</th><th>Caixinha</th><th>Descrição</th><th class="r">Valor</th></tr></thead>
    <tbody>${list.map((m) => `<tr class="${m.bill_id ? '' : 'clickable'}" ${m.bill_id ? 'title="Gerado pela conta paga"' : `data-edit-reserve="${m.id}"`}><td>${m.date.split('-').reverse().join('/')}</td><td><span style="display:inline-flex;align-items:center;gap:6px">${svIcon(svName(m.savings_id))} ${esc(svName(m.savings_id)?.name || '—')}</span></td><td>${esc(m.note || '')} ${m.bill_id || m.month ? '<span class="pill gray">automático</span>' : ''}</td><td class="r ${m.amount >= 0 ? 'good' : 'neg'}">${m.amount >= 0 ? '+' : '−'} ${money(Math.abs(m.amount))}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Sem movimentos</td></tr>'}</tbody></table></div>
  </section>`;
}

async function viewEmprestimos(d) {
  const loans = await Promise.all((await api('loans')).map((l) => api(`loan-detail/${l.id}?month=${state.month}`)));
  const totalBal = loans.filter((l) => l.active).reduce((s, l) => s + l.balance, 0);
  const monthly = loans.filter((l) => l.active && l.this_month).reduce((s, l) => s + l.installment, 0);
  return `
  <div class="grid-3">
    <div class="panel stat"><small>Saldo devedor total ${help('devedor')}</small><b>${money(totalBal)}</b></div>
    <div class="panel stat"><small>Parcelas neste mês</small><b>${money(monthly)}</b></div>
    <div class="panel stat"><small>Já pago</small><b class="good">${money(loans.reduce((s, l) => s + l.paid_total, 0))}</b></div>
  </div>
  <div class="page-head"><h2></h2><div style="display:flex;gap:8px"><button class="btn" data-form="loanpay">Antecipar / pagar avulso</button><button class="btn primary" data-form="loan">+ Empréstimo</button></div></div>
  ${loans.map((l) => `
  <section class="panel" style="${l.active ? '' : 'opacity:.6'}">
    <div class="panel-head">
      <div style="min-width:0"><h2 style="margin:0">${esc(l.name)} <span class="muted">${esc(l.lender || '')}</span></h2>
        <div class="muted small">Pegou ${money(l.principal)} · ${l.installments}× de ${money(l.installment)} · vence todo dia ${l.due_day} · de ${monthShort(l.first_date.slice(0, 7))} a ${monthShort(l.end_month)}</div></div>
      <button class="link-btn" data-edit-loan="${l.id}">Editar</button>
    </div>
    <div class="loan-top">
      <div><small>Saldo devedor ${help('devedor')}</small>${big(l.balance, 'md')}</div>
      <div><small>Parcelas pagas</small><b>${l.done} de ${l.installments}</b>${l.covered ? `<small>${l.covered} por antecipação</small>` : ''}</div>
      <div><small>Total a pagar</small><b>${money(l.total)}</b><small>juros ${money(l.interest)}</small></div>
      <div><small>Já pago</small><b class="good">${money(l.paid_total)}</b>${l.saved_by_prepay > 0 ? `<small>economizou ${money(l.saved_by_prepay)} antecipando</small>` : ''}</div>
    </div>
    ${l.bank_balance > 0 ? `<div class="small" style="margin:-2px 0 10px">Pelo banco${l.bank_balance_date ? ` (em ${l.bank_balance_date.split('-').reverse().join('/')})` : ''}: <b>${money(l.bank_balance)}</b> para quitar · soma das parcelas: ${money(l.balance)} · <span class="good">diferença ${money(l.balance - l.bank_balance)}</span> <span class="muted">(juros que deixam de ser cobrados se quitar/antecipar)</span></div>` : ''}
    <div class="progress" style="height:12px"><span style="width:${l.pct}%"></span></div>
    <div class="small muted" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>${pct(l.pct)} quitado</span><span>${l.next ? `Próxima: parcela ${l.next.no} em ${monthShort(l.next.month)}` : 'Quitado'}</span></div>
    ${l.this_month ? `<div style="margin-top:12px"><button class="btn ${l.this_month.paid ? '' : 'primary'}" data-pay="loan:${l.id}:${l.this_month.paid ? 0 : 1}">${l.this_month.paid ? `${I.check} Parcela ${l.this_month.no} paga (desfazer)` : `Pagar parcela ${l.this_month.no} de ${monthName(state.month).toLowerCase()} · ${money(l.installment)}`}</button></div>` : ''}
    <div class="label-caps">Parcelas</div>
    <div class="inst-grid">${l.grid.map((g) => `<span class="inst ${g.status} ${g.month === state.month ? 'now' : ''}" title="Parcela ${g.no} · ${monthShort(g.month)} · ${g.status}">${g.no}</span>`).join('')}</div>
    <div class="small muted inst-legend"><span><i class="inst paga"></i>paga</span><span><i class="inst antecipada"></i>antecipada</span><span><i class="inst atrasada"></i>em atraso</span><span><i class="inst aberta"></i>a pagar</span></div>
    ${l.payments.length ? `<details style="margin-top:10px"><summary class="small" style="cursor:pointer;font-weight:600">Histórico de pagamentos (${l.payments.length})</summary>
      <div class="table-wrap"><table><tbody>${l.payments.map((p) => `<tr class="clickable" data-edit-loanpay="${p.id}"><td>${p.date.split('-').reverse().join('/')}</td><td>${p.kind === 'extra' ? `Antecipação · ${p.covers} parcela(s)` : `Parcela ${p.installment_no}`}</td><td class="muted">${esc(p.note || '')}</td><td class="r">${money(p.amount)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
  </section>`).join('') || '<section class="panel empty">Nenhum empréstimo. Clique em “+ Empréstimo”.</section>'}`;
}

async function viewProjetos(d) {
  const all = await api('projects');
  return `<section class="panel">
    <div class="page-head"><h2>Projetos e obras</h2><button class="btn sm primary" data-form="project">+ Projeto</button></div>
    <div class="table-wrap"><table><thead><tr><th>Projeto</th><th>Status</th><th>Período</th><th class="r">Valor do mês</th><th class="r">Orçamento</th></tr></thead>
    <tbody>${all.map((p) => `<tr class="clickable" data-edit-project="${p.id}"><td><b>${esc(p.name)}</b><div class="muted small">${esc(p.description || '')}</div></td><td><span class="pill ${p.status === 'pago' ? 'green' : p.status === 'confirmado' ? 'blue' : 'amber'}">${esc(p.status)}</span></td><td class="muted">${p.start_month ? monthShort(p.start_month) : '—'} → ${p.end_month ? monthShort(p.end_month) : '…'}</td><td class="r">${money(p.monthly_amount)}</td><td class="r">${money(p.budget_total)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nenhum projeto</td></tr>'}</tbody></table></div>
  </section>`;
}

function viewRenda(d) {
  const s = d.settings;
  return `
  <section class="panel">
    <div class="page-head"><h2>Pessoas e renda</h2><button class="btn sm" data-form="person">+ Pessoa</button></div>
    <div class="rows">${d.people.map((p) => `<div class="row clickable" data-edit-person="${p.id}"><div class="name">${avatar(p)}<span>${esc(p.name)} ${p.is_me ? '<span class="pill blue">você</span>' : ''}</span></div><div class="val">${money(p.salary)}</div></div>`).join('')}</div>
  </section>
  <section class="panel">
    <h2>Ajustes</h2>
    <form id="settingsForm" style="display:grid;gap:12px;max-width:560px">
      <div class="form-row">
        <div class="field"><label>Orçamento do dia a dia (R$/mês)</label><input name="daily_budget" type="number" step="0.01" value="${esc(s.daily_budget)}"></div>
        <div class="field"><label>Divisão das contas da casa</label><select name="split_mode"><option value="proporcional" ${s.split_mode !== 'igual' ? 'selected' : ''}>Proporcional à renda</option><option value="igual" ${s.split_mode === 'igual' ? 'selected' : ''}>Meio a meio</option></select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Referência de moradia (% do salário)</label><input name="housing_ref" type="number" value="${esc(s.housing_ref)}"></div>
        <div class="field"><label>Metas de poupança</label><a class="btn" href="#reserva" style="text-align:center">Definir nas caixinhas</a></div>
      </div>
      <div><button class="btn primary">Salvar ajustes</button></div>
    </form>
  </section>
  <section class="panel">
    <h2>Backup</h2>
    <p class="muted small" style="margin-top:0">O backup automático já vem ligado. Veja, configure ou restaure em <a href="#backup">Ajustes → Backup</a>.</p>
  </section>`;
}

function viewContas(d) {
  return api('bills').then((bills) => {
    const group = (kind) => bills.filter((b) => b.kind === kind);
    const table = (list) => `<div class="table-wrap"><table><thead><tr><th>Conta</th><th>Vence</th><th>Quem paga</th><th>Período</th><th class="r">Valor</th></tr></thead><tbody>
      ${list.map((b) => {
        const p = d.people.find((x) => x.id === b.owner_id);
        return `<tr class="clickable" data-edit-bill="${b.id}" style="${b.active ? '' : 'opacity:.5'}"><td>${esc(b.name)} ${b.is_housing ? '<span class="pill gray">moradia</span>' : ''} ${b.is_reserve ? '<span class="pill green">reserva</span>' : ''}</td><td>dia ${b.due_day}</td><td>${esc(p?.name || '—')}</td><td class="muted">${b.start_month ? monthShort(b.start_month) : '—'} → ${b.end_month ? monthShort(b.end_month) : '…'}</td><td class="r">${money(b.amount)}</td></tr>`;
      }).join('') || '<tr><td colspan="5" class="empty">Nenhuma</td></tr>'}</tbody></table></div>`;
    return `
    <section class="panel"><div class="page-head"><h2>Contas da casa</h2><button class="btn sm primary" data-form="bill">+ Conta</button></div>${table(group('casa'))}</section>
    <section class="panel"><div class="page-head"><h2>Contas pessoais</h2><button class="btn sm" data-form="bill" data-kind="pessoal">+ Conta pessoal</button></div>${table(group('pessoal'))}</section>`;
  });
}

function viewBancos() {
  const groups = {};
  BANKS.forEach((b) => { (groups[b.bank] = groups[b.bank] || []).push(b); });
  return `<section class="panel">
    <div class="page-head"><h2>Bancos e cores dos cartões</h2><button class="btn sm primary" data-form="bank">+ Banco</button></div>
    <p class="muted small" style="margin-top:6px">Ao cadastrar um cartão, o app reconhece o banco pelo nome e aplica estas cores. “busca web” = cor conferida em pesquisa; “aproximada” = estimada. Clique para ajustar.</p>
    <div class="bank-grid">${BANKS.map((b) => `<button class="bank-item" data-edit-bank="${b.id}">${cardVisual({ bank: b.bank, name: b.tier || '', preset: b.slug, due_day: 10, free_limit: 0 }, { cls: 'mini-card' })}<b>${esc(b.label)}</b><small>${esc(b.color)} · ${esc(b.source || '')}</small></button>`).join('')}</div>
  </section>`;
}

function accountHead(a, opts = {}) {
  const fb = findBank(a.bank);
  const p = PRESETS[a.preset] || (fb && PRESETS[fb.slug]);
  const bg = p ? p.bg : safeColor(a.color, '#16a34a');
  const fg = p ? p.fg : '#fff';
  return `<div class="acct-head ${opts.cls || ''}" style="background:${bg};color:${fg}">
    <div class="acct-top"><span>${esc(a.bank || p?.bank || 'Banco')}</span>${a.salary_day ? `<span class="tag">salário dia ${a.salary_day}</span>` : ''}</div>
    <div class="acct-name">${esc(a.name || 'Nova conta')}</div>
    <div class="acct-bal"><small>Saldo hoje</small><b>${money(a.balance ?? 0)}</b></div>
  </div>`;
}

async function viewContasBanco(d) {
  const list = await Promise.all((d.accounts?.list || []).map((a) => api(`account-detail/${a.id}?month=${state.month}`)));
  const kindLabel = { salario: 'Salário', fatura: 'Fatura', conta: 'Conta', parcela: 'Empréstimo', poupanca: 'Poupança', entrada: 'Entrada', gasto: 'Gasto', ajuste: 'Ajuste', deposito: 'Depósito', saque: 'Saque', transferencia: 'Transferência', rendimento: 'Rendimento' };
  const t = today();
  return `
  <div class="grid-3">
    <div class="panel stat stat-ic">${illus('banco', 'q-ic')}<small>Saldo em contas hoje ${help('contas')}</small><b>${money(d.accounts.my_balance)}</b></div>
    <div class="panel stat stat-ic">${illus('carteira', 'q-ic')}<small>Previsto no fim de ${monthName(state.month).toLowerCase()} ${help('fimmes')}</small><b class="${d.accounts.my_projected < 0 ? 'neg' : ''}">${money(d.accounts.my_projected)}</b></div>
    <div class="panel stat"><small>Avisos ${help('avisos')}</small><b class="${d.accounts.alerts.length ? 'neg' : 'good'}" style="font-size:15px">${d.accounts.alerts.length ? d.accounts.alerts.map((a) => `${esc(a.name)} fica em ${money(a.amount)} dia ${a.date.slice(8)}`).join('<br>') : 'Nenhuma conta fica negativa'}</b></div>
  </div>
  <div class="page-head"><h2></h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-form="move">Ajustar saldo</button><button class="btn primary" data-form="account">+ Conta bancária</button></div></div>
  ${list.map((a) => `
  <section class="panel acct-panel">
    <div class="acct-layout">
      <div>
        ${accountHead(a)}
        <div class="acct-facts">
          <div><small>Entrou no mês</small><b class="good">${money(a.month_in)}</b></div>
          <div><small>Saiu no mês</small><b>${money(a.month_out)}</b></div>
          <div><small>Fim do mês</small><b class="${a.projected < 0 ? 'neg' : ''}">${money(a.projected)}</b></div>
        </div>
        ${a.lowest.amount < 0 ? `<div class="alert-bad">${I.alert} O saldo fica negativo (${money(a.lowest.amount)}) em ${a.lowest.date.split('-').reverse().slice(0, 2).join('/')}. Deposite antes dos débitos.</div>` : ''}
        <div class="label-caps">Cartões vinculados</div>
        <div class="acct-cards">${a.cards.map((c) => `<a href="#cartoes" class="acct-card"><span class="sw" style="background:${PRESETS[c.preset]?.bg || '#1f2937'}"></span><div><b>${esc(c.bank || '')} ${esc(c.name)}</b><small>${c.kind === 'multiplo' ? 'Débito e crédito' : 'Crédito'}${c.auto_debit ? ` · fatura em débito automático dia ${c.due_day}` : ` · vence dia ${c.due_day}`}</small></div></a>`).join('') || '<div class="muted small">Nenhum. Edite um cartão e escolha esta conta em “Conta vinculada”.</div>'}</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-edit-account="${a.id}">Editar conta</button><button class="btn sm" data-form="transaction" data-account="${a.id}">Lançar gasto/entrada</button></div>
      </div>
      <div style="min-width:0">
        <div class="label-caps" style="margin-top:0">Próximos lançamentos em ${monthName(state.month).toLowerCase()}</div>
        <div class="rows">${a.upcoming.map((u) => `<div class="row"><div class="name"><span class="date-chip ${u.date < t ? 'late' : ''}">${u.date.slice(8)}/${u.date.slice(5, 7)}</span><span>${esc(u.note)}${u.date < t ? ' <span class="pill amber">em atraso</span>' : u.auto ? ' <span class="pill blue">automático</span>' : ''}</span></div><span class="val ${u.amount > 0 ? 'good' : ''}">${u.amount > 0 ? '+' : '−'} ${money(Math.abs(u.amount))}</span></div>`).join('') || '<div class="empty">Nada previsto</div>'}</div>
        <div class="label-caps">Extrato de ${monthName(state.month).toLowerCase()}</div>
        <div class="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th class="r">Valor</th><th class="r">Saldo</th></tr></thead><tbody>
          ${a.statement.map((e) => `<tr class="${e.source === 'tx' || !e.ref ? 'clickable' : ''}" ${e.source === 'tx' ? `data-edit-tx="${e.id}"` : e.ref ? 'title="Lançamento automático"' : `data-edit-move="${e.id}"`}><td>${e.date.slice(8)}/${e.date.slice(5, 7)}</td><td>${esc(e.note)} <span class="pill gray">${kindLabel[e.kind] || e.kind}</span></td><td class="r ${e.amount >= 0 ? 'good' : ''}">${e.amount >= 0 ? '+' : '−'} ${money(Math.abs(e.amount))}</td><td class="r muted">${money(e.balance)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Sem movimento neste mês</td></tr>'}
        </tbody></table></div>
      </div>
    </div>
  </section>`).join('') || `<section class="panel empty">${illus('banco')}<p>Cadastre a conta onde cai seu salário (ex.: Sicredi) para acompanhar o saldo, os débitos automáticos e o Pix.</p><button class="btn primary" data-form="account">+ Conta bancária</button></section>`}`;
}

// ---------- Conectar IA (MCP) ----------
const IA_TOOLS = [
  ['ver', 'consultar: resumo, contas a pagar, cartões, contas bancárias e extrato, empréstimos, poupança, lançamentos, relatório'],
  ['lancar', 'gasto ou entrada (Pix/débito/dinheiro), compra no cartão parcelada, guardar ou retirar da caixinha, apagar lançamento'],
  ['pagar', 'marcar conta, fatura, parcela ou depósito como pago (pelo nome)'],
  ['cadastrar', 'conta fixa, empréstimo, antecipação de parcelas'],
];
async function viewIA() {
  const tokens = await api('tokens');
  const isDemo = !!window.__bootDemo;
  const fresh = state.newToken;
  const tab = state.iaTab || 'claude';
  const url = fresh?.url || `${location.origin}/mcp/SUA-CHAVE`;
  const steps = {
    claude: ['No Claude (site ou app), abra <b>Configurações → Conectores</b>.', 'Clique em <b>Adicionar conector personalizado</b>.', 'Nome: <b>Casa em Dia</b>. URL: cole o endereço da chave.', 'Salve e, numa conversa, ative o conector Casa em Dia.'],
    chatgpt: ['No ChatGPT, abra <b>Configurações → Apps e conectores</b> e ligue o <b>modo desenvolvedor</b> (em Avançado).', 'Clique em <b>Criar</b> (novo conector).', 'URL do servidor MCP: cole o endereço da chave. Autenticação: <b>nenhuma</b> (a chave já vai no endereço).', 'Salve e use o conector na conversa.'],
    code: ['Claude Code / terminal:', `<code class="code">claude mcp add --transport http casa-em-dia ${esc(url)}</code>`, 'Claude Desktop: Configurações → Conectores → Adicionar conector personalizado, com o mesmo endereço.'],
    outro: ['Qualquer cliente que aceite <b>MCP via HTTP</b> (Streamable HTTP).', 'Endereço: o da chave. Ou use <code>/mcp</code> com o cabeçalho <code>Authorization: Bearer SUA-CHAVE</code>.'],
  };
  return `
  <section class="panel">
    <div class="panel-head"><div><h2>Conectar IA</h2><p class="muted small" style="margin:4px 0 0;max-width:640px">Ligue o Claude, o ChatGPT ou outra IA ao Casa em Dia. Aí é só pedir na conversa: “lança 50 reais de mercado no Pix da Sicredi”, “quanto tenho livre no cartão?”, “me faz o relatório do mês”. A IA usa o <b>seu acesso</b>: ela pode fazer só o que o seu nível permite.</p></div></div>
    ${isDemo ? '<div class="alert-bad" style="background:var(--amber-soft);color:#b45309">Esta é a versão de teste: a IA não consegue acessar daqui. Instalado no servidor, o endereço gerado funciona.</div>' : ''}
    ${fresh ? `<div class="token-box"><b>Chave criada. Copie agora — ela não aparece de novo.</b>
      <div class="token-row"><input id="tokenUrl" readonly value="${esc(fresh.url)}"><button class="btn primary" id="copyToken">Copiar</button></div>
      <small class="muted">Esse endereço já leva a chave. Guarde como senha: quem tiver ele acessa suas finanças.</small></div>` : `
      <form id="tokenForm" class="token-row" style="margin-top:14px"><input id="tokenName" placeholder="Nome da chave (ex.: Claude do Diego)" maxlength="60" required><button class="btn primary">Gerar chave de acesso</button></form>`}
  </section>
  <div class="grid-2">
    <section class="panel">
      <h2>Como conectar</h2>
      <div class="tabs four">${[['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['code', 'Desktop / Code'], ['outro', 'Outros']].map(([k, l]) => `<button data-ia-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <ol class="steps">${steps[tab].map((x) => `<li>${x}</li>`).join('')}</ol>
      <p class="muted small"><b>Importante:</b> a IA acessa pela internet, então o app precisa ter um endereço <b>https</b> público (ex.: Tailscale Funnel, Cloudflare Tunnel ou Caddy com domínio). Configure esse endereço em <code>PUBLIC_URL</code> no docker-compose.</p>
    </section>
    <section class="panel">
      <h2>O que a IA consegue fazer</h2>
      <p class="muted small" style="margin-top:0">São só <b>4 ferramentas</b> com respostas curtas, para gastar pouco do plano da IA (funciona bem até nas versões gratuitas).</p>
      <ul class="ia-list">${IA_TOOLS.map(([k, t]) => `<li><b>${k}</b> — ${esc(t)}</li>`).join('')}</ul>
      <p class="muted small"><b>Dicas para economizar:</b> peça direto (“gasto 50 mercado no pix sicredi”, “paguei o aluguel”, “resumo do mês”). Gráficos: peça “faz um gráfico com o relatório do mês”.</p>
    </section>
  </div>
  <section class="panel">
    <h2>Suas chaves</h2>
    <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Chave</th><th>Criada</th><th>Último uso</th><th></th></tr></thead><tbody>
      ${tokens.map((t) => `<tr><td><b>${esc(t.name)}</b></td><td class="muted"><code>${esc(t.prefix)}…</code></td><td class="muted">${esc(String(t.created_at).slice(0, 10).split('-').reverse().join('/'))}</td><td class="muted">${t.last_used ? esc(t.last_used.slice(0, 16).replace('T', ' ')) : 'nunca'}</td><td class="r"><button class="btn sm danger" data-revoke="${t.id}">Revogar</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nenhuma chave ainda</td></tr>'}
    </tbody></table></div>
  </section>`;
}

async function viewReceitas(d) {
  const people = d.people || [];
  const f = state.incFilter ?? d.me.id; // pessoa, ou 'all' = casal
  const o = await api(`incomes-overview?month=${state.month}${f === 'all' ? '' : `&person=${f}`}`);
  state.incomes = (await api('incomes'));
  const pname = (id) => people.find((p) => p.id === id)?.name || '—';
  const aname = (id) => (d.accounts?.list || []).find((a) => a.id === id)?.name || 'dinheiro';
  const mY = (m) => (m ? `${MESES[Number(m.slice(5, 7)) - 1].slice(0, 3).toLowerCase()}/${m.slice(0, 4)}` : '');
  const dmy = (x) => (x ? x.split('-').reverse().join('/') : '');
  const live = o.list.filter((i) => i.active).sort((a, b) => String(a.next_due || '9').localeCompare(String(b.next_due || '9')));
  const closed = o.list.filter((i) => !i.active);
  const card = (i) => { const m = i.month; const st = INC_STATUS[m.status] || INC_STATUS.previsto; return `
    <div class="inc-card" style="${i.active ? '' : 'opacity:.6'}">
      <div class="inc-head">
        <div style="min-width:0"><b>${esc(i.name)}</b> <span class="pill ${st[1]}">${st[0]} ${st[2]}</span>
          <div class="muted small">${esc(INC_KINDS.find((k) => k[0] === i.kind)?.[1] || 'Outro')}${i.payer ? ` · ${esc(i.payer)}` : ''} · ${esc(pname(i.owner_id))} · ${esc(aname(i.account_id))}${i.day ? ` · dia ${i.day}` : ''}</div></div>
        <div class="val"><b>${money(m.expected || i.amount)}</b><div class="muted small">${esc(m.cycle_txt)}${i.amount_type === 'variavel' ? ' · variável' : ''}</div></div>
      </div>
      ${m.month_no ? `<div class="small">Mês ${m.month_no} de ${m.months_total} — termina em ${mY(m.end_month)}</div>` : i.end_month_calc ? `<div class="small muted">${i.end_month_calc < state.month ? 'Terminou' : 'Termina'} em ${mY(i.end_month_calc)}</div>` : ''}
      ${m.expected > 0 ? `<div class="small">${m.parts > 1 ? `${m.parts_received}/${m.parts} recebido — ` : ''}${money(m.received)} de ${money(m.expected)}${m.status === 'atrasado' ? ` · <span class="neg">${m.late_days} dia(s) de atraso</span>` : ''}</div><div class="progress"><span style="width:${Math.min(100, (m.received / m.expected) * 100)}%"></span></div>` : m.received > 0 ? `<div class="small">Recebido no mês: ${money(m.received)}</div>` : ''}
      <div class="inc-actions">
        ${i.active ? `<button class="btn sm primary" data-receive="${i.id}">Recebi</button>` : ''}
        <button class="btn sm" data-edit-income="${i.id}">Editar</button>
        ${i.active ? `<button class="btn sm" data-close-income="${i.id}">Encerrar</button>` : ''}
      </div>
      ${i.all_receipts.length || i.history.length > 1 ? `<details><summary>Histórico (${i.all_receipts.length} recebimento${i.all_receipts.length === 1 ? '' : 's'})</summary>
        <div class="rows">${i.all_receipts.map((r) => `<div class="row"><div style="min-width:0"><b class="small">${dmy(r.date)}</b> <span class="muted small">ref. ${mY(r.ref_month)}${r.note ? ` · ${esc(r.note)}` : ''}</span></div><div style="display:flex;gap:8px;align-items:center"><span class="val">${money(r.amount)}</span><button class="btn sm" data-undo-receipt="${r.id}">Desfazer</button></div></div>`).join('')}</div>
        ${i.history.length > 1 ? `<div class="muted small" style="margin-top:6px">Valores: ${i.history.map((h) => `${money(h.amount)} desde ${mY(h.from_month)}`).join(' → ')}</div>` : ''}
      </details>` : ''}
    </div>`; };
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Receitas e contratos ${help('receitas')}</h2><p class="muted small" style="margin:4px 0 0;max-width:660px">Tudo que entra com regularidade: contratos com prazo, salário, vale-alimentação, freelas. O app prevê o que deve cair em cada conta; quando cair, toque em “Recebi”.</p></div><button class="btn primary" data-form="income">+ Nova receita</button></div>
    <div class="filter-chips">${people.map((p) => `<button class="chip ${f === p.id ? 'on' : ''}" data-inc-filter="${p.id}">${esc(p.name)}</button>`).join('')}<button class="chip ${f === 'all' ? 'on' : ''}" data-inc-filter="all">Casal</button></div>
    <div class="grid-3" style="margin-top:12px">
      <div class="stat"><small>Previsto em ${monthName(state.month).toLowerCase()}</small><b>${money(o.expected)}</b></div>
      <div class="stat"><small>Já recebido</small><b class="good">${money(o.received)}</b></div>
      <div class="stat"><small>Falta receber</small><b>${money(o.remaining)}</b></div>
    </div>
  </section>
  <section class="panel"><h2>Ativas</h2>${live.map(card).join('') || '<div class="empty">Nenhuma receita ainda. Cadastre o salário, contratos e benefícios em “+ Nova receita”.</div>'}</section>
  ${closed.length ? `<section class="panel"><details><summary><b>Encerradas (${closed.length})</b></summary><div style="margin-top:10px">${closed.map(card).join('')}</div></details></section>` : ''}`;
}

async function viewDespensa() {
  const o = await api('despensa');
  state.pantry = o.items;
  const cat = Object.fromEntries(PANTRY_CATS);
  const qn = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
  const groups = PANTRY_CATS.map(([k, label]) => [label, o.items.filter((i) => i.category === k)]).filter(([, l]) => l.length);
  const others = o.items.filter((i) => !cat[i.category]); if (others.length) groups.push(['Outros', others]);
  const badge = (i) => (i.out ? '<span class="pill red">acabou</span>' : i.low ? '<span class="pill amber">acabando</span>' : '');
  const row = (i) => `<div class="row pantry-row">
      <div class="name" style="min-width:0"><div style="min-width:0"><button class="link-plain" data-pantry-open="${i.id}"><b>${esc(i.name)}</b></button> ${badge(i)}
        <div class="muted small">${i.monthly ? `costuma comprar ${qn(i.monthly)} ${esc(i.unit)}/mês` : 'sem histórico ainda'}${i.days_left != null && !i.out ? ` · dura ~${i.days_left} dia${i.days_left === 1 ? '' : 's'}` : ''}${i.last_price ? ` · último ${money(i.last_price)}${i.price_trend ? ` <span class="${i.price_trend > 0 ? 'neg' : 'good'}">${i.price_trend > 0 ? '↑' : '↓'}${Math.abs(Math.round(i.price_trend))}%</span>` : ''}` : ''}</div></div></div>
      <div class="pantry-qty"><button class="icon-btn" data-pantry-use="${i.id}" aria-label="Usei 1 ${esc(i.name)}" title="Usei 1" ${i.qty <= 0 ? 'disabled' : ''}>−</button><b>${qn(i.qty)}</b><span class="muted small">${esc(i.unit)}</span><button class="icon-btn" data-pantry-buy="${i.id}" aria-label="Comprei ${esc(i.name)}" title="Comprei">+</button></div>
    </div>`;
  const listTxt = o.list.map((i) => `- ${i.name}: ${i.suggest} ${i.unit}`).join('\n');
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Despensa ${help('despensa')}</h2><p class="muted small" style="margin:4px 0 0;max-width:660px">O que tem em casa, o que está acabando e quanto você costuma pagar. Vale para a casa toda. Use o − quando usar e o + quando comprar, ou diga para a IA: “acabou o café”, “comprei 5 kg de arroz por 32”.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-form="pantryBuy">Comprei</button><button class="btn primary" data-form="pantry">+ Produto</button></div></div>
    <div class="grid-3" style="margin-top:12px">
      <div class="stat"><small>Produtos</small><b>${o.totals.count}</b><small>${o.totals.out} acabou · ${o.totals.low} para comprar</small></div>
      <div class="stat"><small>Gasto em compras no mês</small><b>${money(o.totals.month_spent)}</b><small>do que foi registrado aqui</small></div>
      <div class="stat"><small>Valor em estoque</small><b>${money(o.totals.stock_value)}</b><small>pelo último preço pago</small></div>
    </div>
  </section>
  <div class="grid-2">
    <section class="panel">
      <div class="page-head"><h2>Lista de compras</h2>${o.list.length ? `<button class="btn sm" id="pantryCopy" data-text="${esc(listTxt)}">Copiar lista</button>` : ''}</div>
      <div class="rows">${o.list.map((i) => `<div class="row"><div class="name" style="min-width:0"><button class="check" data-pantry-buy="${i.id}" data-qty="${i.suggest}" aria-label="Comprei ${esc(i.name)}"></button><div style="min-width:0"><b>${esc(i.name)}</b> ${badge(i)}<div class="muted small">comprar ${i.suggest} ${esc(i.unit)} · tem ${qn(i.qty)}${i.last_store ? ` · último em ${esc(i.last_store)}` : ''}</div></div></div><span class="val">${i.est_cost ? `~${money(i.est_cost)}` : '—'}</span></div>`).join('') || '<div class="empty">Nada em falta. 🎉</div>'}</div>
      ${o.list.length ? `<p class="muted small" style="margin-top:8px">Estimativa pelo último preço: <b>${money(o.totals.list_cost)}</b>. Toque no círculo quando comprar.</p>` : ''}
    </section>
    <section class="panel">
      <h2>Está caro ou barato?</h2>
      <p class="muted small" style="margin-top:0">No mercado, informe o preço da prateleira e compare com o que você costuma pagar.</p>
      <form id="pantryPrice" class="form-row" style="align-items:end">
        <div class="field"><label for="pp_item">Produto</label><select id="pp_item" name="item" required>${o.items.filter((i) => i.avg_price).map((i) => `<option value="${i.id}">${esc(i.name)} (${esc(i.unit)})</option>`).join('')}</select></div>
        <div class="field"><label for="pp_price">Preço por unidade (R$)</label><input id="pp_price" name="price" inputmode="decimal" required></div>
        <button class="btn primary" style="align-self:end;height:52px">Comparar</button>
      </form>
      <div id="pantryPriceOut" style="margin-top:10px"></div>
    </section>
  </div>
  ${groups.map(([label, list]) => `<section class="panel"><h2>${esc(label)} <span class="muted small">${list.length}</span></h2><div class="rows">${list.map(row).join('')}</div></section>`).join('') || '<section class="panel"><div class="empty">Despensa vazia. Cadastre o primeiro produto em “+ Produto”, ou peça para a IA: “comprei 2 kg de arroz por 12 reais”.</div></section>'}
  ${o.inactive.length ? `<section class="panel"><details><summary><b>Não acompanho mais (${o.inactive.length})</b></summary><div class="rows" style="margin-top:8px">${o.inactive.map((i) => `<div class="row clickable" data-edit-pantry="${i.id}"><span>${esc(i.name)}</span><span class="muted small">reativar</span></div>`).join('')}</div></details></section>` : ''}`;
}

async function openPantryItem(id) {
  const h = await api(`despensa/history/${id}`);
  const i = h.item; const form = $('#modalForm'); const dlg = $('#modal');
  const dmy = (x) => x.split('-').reverse().join('/');
  const kind = { compra: 'Comprei', uso: 'Usei', ajuste: 'Contagem' };
  form.innerHTML = `<h3>${esc(i.name)}</h3>
    <div class="grid-3">
      <div class="stat"><small>Em casa</small><b>${String(i.qty).replace('.', ',')} ${esc(i.unit)}</b><small>mínimo ${String(i.min_qty).replace('.', ',')}</small></div>
      <div class="stat"><small>Costuma comprar</small><b>${i.monthly ? `${String(i.monthly).replace('.', ',')}/mês` : '—'}</b><small>${i.days_left != null ? `dura ~${i.days_left} dias` : 'sem histórico'}</small></div>
      <div class="stat"><small>Preço</small><b>${i.last_price ? money(i.last_price) : '—'}</b><small>${i.avg_price ? `média ${money(i.avg_price)} · menor ${money(i.min_price)}` : 'sem compras com preço'}</small></div>
    </div>
    <div class="label-caps" style="margin-top:14px">Histórico</div>
    <div class="rows" style="max-height:300px;overflow:auto">${h.moves.map((m) => `<div class="row"><div style="min-width:0"><b class="small">${dmy(m.date)}</b> <span class="muted small">${kind[m.kind] || m.kind} ${String(Math.abs(m.qty)).replace('.', ',')} ${esc(i.unit)}${m.store ? ` · ${esc(m.store)}` : ''}${m.transaction_id ? ' · lançado no financeiro' : ''}</span></div><div style="display:flex;gap:8px;align-items:center"><span class="val">${m.unit_price ? `${money(m.unit_price)}/${esc(i.unit)}` : ''}</span><button type="button" class="btn sm" data-undo-move="${m.id}">Desfazer</button></div></div>`).join('') || '<div class="empty">Nada registrado ainda</div>'}</div>
    <div class="form-actions"><button type="button" class="btn" id="pEdit">Editar produto</button><div class="right"><button type="button" class="btn" id="pCount">Acertar contagem</button><button type="button" class="btn primary" id="cancelBtn">Fechar</button></div></div>`;
  $('#cancelBtn').onclick = () => dlg.close();
  $('#pEdit').onclick = async () => openForm('pantry', await api(`pantry/${id}`));
  $('#pCount').onclick = async () => {
    const v = await askValue(`Quanto tem de ${i.name} em casa agora? (${i.unit})`, i.qty);
    if (v == null) return; await api('despensa/count', { method: 'POST', body: { item_id: id, qty: v } }); toast('Contagem acertada'); dlg.close(); refresh();
  };
  form.querySelectorAll('[data-undo-move]').forEach((b) => { b.onclick = async () => {
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirmar'; return; }
    await api('despensa/undo', { method: 'POST', body: { id: Number(b.dataset.undoMove) } }); toast('Desfeito'); dlg.close(); refresh();
  }; });
  form.onsubmit = (e) => e.preventDefault();
  dlg.showModal();
}
// Pergunta um número dentro da página (sem prompt() do navegador).
function askValue(text, initial) {
  return new Promise((resolve) => {
    const form = $('#modalForm'); const dlg = $('#modal');
    form.innerHTML = `<h3>${esc(text)}</h3><div class="field"><input id="askV" inputmode="decimal" value="${esc(String(initial ?? ''))}"></div>
      <div class="form-actions"><div class="right"><button type="button" class="btn" id="askNo">Cancelar</button><button class="btn primary">Salvar</button></div></div>`;
    $('#askNo').onclick = () => { dlg.close(); resolve(null); };
    form.onsubmit = (e) => { e.preventDefault(); const v = Number(String($('#askV').value).replace(',', '.')); dlg.close(); resolve(Number.isFinite(v) ? v : null); };
    if (!dlg.open) dlg.showModal();
    $('#askV').select();
  });
}

// Ajuda e suporte: busca nas respostas prontas; só abre chamado com o administrador se a pessoa quiser.
async function viewSuporte() {
  const [base, sup] = await Promise.all([api('ajuda'), api('suporte')]);
  const ins = sup.admin ? await api('ajuda/insights').catch(() => null) : null;
  state.faq = base.faq;
  const cats = [...new Set(base.faq.map((f) => f.cat))];
  const stTxt = { aberto: ['amber', 'Aguardando resposta'], respondido: ['green', 'Respondido'], fechado: ['gray', 'Fechado'] };
  const when = (x) => new Date(String(x).replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const ticketRow = (t) => { const st = sup.admin && t.status === 'aberto' ? ['amber', 'Esperando você'] : stTxt[t.status] || stTxt.aberto; return `<div class="row clickable" data-ticket="${t.id}"><div style="min-width:0"><b>${esc(t.subject)}</b> <span class="pill ${st[0]}">${st[1]}</span>
      <div class="muted small">${sup.admin ? `${esc(t.user_name || '—')} · ` : ''}${when(t.updated_at)} · ${t.last_from_admin ? 'suporte: ' : ''}${esc(String(t.last_body || '').slice(0, 80))}</div></div></div>`; };
  return `
  <section class="panel">
    <h2>Ajuda e suporte</h2>
    <p class="muted small" style="margin:4px 0 12px">Escreva sua dúvida do seu jeito. As respostas aparecem na hora.</p>
    <form id="helpSearch" class="help-search"><input id="hs_q" name="q" placeholder="Ex.: como conecto o ChatGPT? esqueci a senha" autocomplete="off" aria-label="Sua dúvida"><button class="btn primary">Buscar</button></form>
    <div id="helpResults"></div>
  </section>
  ${sup.admin && ins ? `<section class="panel"><h2>Painel do suporte <span class="muted small">só o administrador vê</span></h2>
    <div class="grid-3">
      <div class="stat"><small>Chamados esperando você</small><b class="${ins.open ? 'warn' : ''}">${ins.open}</b></div>
      <div class="stat"><small>Mais procurado (90 dias)</small><b style="font-size:16px">${esc(ins.top[0]?.q || '—')}</b><small>${ins.top[0] ? `${ins.top[0].n} vez(es)` : ''}</small></div>
      <div class="stat"><small>Buscas sem resposta</small><b>${ins.missed.length}</b><small>ideias de novas respostas</small></div>
    </div>
    ${ins.missed.length ? `<details style="margin-top:10px"><summary class="small"><b>O que procuraram e não acharam</b></summary><div class="rows" style="margin-top:6px">${ins.missed.map((m) => `<div class="row"><span class="small">“${esc(m.q)}”</span><span class="muted small">${m.n}×</span></div>`).join('')}</div></details>` : ''}
    ${ins.not_helpful.length ? `<details style="margin-top:6px"><summary class="small"><b>Respostas marcadas como “não ajudou”</b></summary><div class="rows" style="margin-top:6px">${ins.not_helpful.map((m) => `<div class="row"><span class="small">${esc(m.q)}</span><span class="muted small">👍 ${m.yes} · 👎 ${m.no}</span></div>`).join('')}</div></details>` : ''}
  </section>` : ''}
  <section class="panel">
    <div class="page-head"><h2>${sup.admin ? 'Chamados' : 'Meus chamados'}</h2>${sup.admin ? '' : '<button class="btn sm" id="ticketNew">Falar com o suporte</button>'}</div>
    <div class="rows">${sup.tickets.map(ticketRow).join('') || `<div class="empty">${sup.admin ? 'Nenhum chamado ainda.' : 'Nenhum chamado. Se a ajuda não resolver, fale com o suporte.'}</div>`}</div>
  </section>
  <section class="panel">
    <h2>Perguntas frequentes</h2>
    ${cats.map((c) => `<div class="label-caps" style="margin-top:12px">${esc(c)}</div><div class="faq">${base.faq.filter((f) => f.cat === c).map((f) => `<details class="faq-item"><summary>${esc(f.q)}</summary>${faqBody(f)}</details>`).join('')}</div>`).join('')}
  </section>`;
}
const faqBody = (f, ask = false) => `<ol class="faq-steps">${f.a.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  <div class="faq-actions">${f.link ? `<a class="btn sm" href="${f.link}">Abrir a tela</a>` : ''}${ask ? `<span class="muted small">Ajudou?</span><button class="btn sm" data-faq-vote="${f.id}:1">Sim</button><button class="btn sm" data-faq-vote="${f.id}:0">Não</button>` : ''}</div>`;

function openTicketForm(prefill = '') {
  const form = $('#modalForm'); const dlg = $('#modal');
  form.innerHTML = `<h3>Falar com o suporte</h3>
    <p class="muted small" style="margin:0">Sua mensagem vai para o administrador do servidor. Você recebe um aviso no sininho quando ele responder.</p>
    <div class="field"><label for="tk_s">Assunto</label><input id="tk_s" maxlength="120" required value="${esc(prefill)}"></div>
    <div class="field"><label for="tk_b">Mensagem</label><textarea id="tk_b" rows="6" maxlength="4000" required placeholder="Conte o que aconteceu e em qual tela."></textarea></div>
    <div class="error" id="formErr"></div>
    <div class="form-actions"><div class="right"><button type="button" class="btn" id="cancelBtn">Cancelar</button><button class="btn primary">Enviar</button></div></div>`;
  $('#cancelBtn').onclick = () => dlg.close();
  form.onsubmit = async (e) => {
    e.preventDefault();
    try { const t = await api('suporte', { method: 'POST', body: { subject: $('#tk_s').value, body: $('#tk_b').value } }); toast('Mensagem enviada ao suporte'); dlg.close(); await refresh(); openTicket(t.id); } catch (err) { $('#formErr').textContent = err.message; }
  };
  dlg.showModal();
}

async function openTicket(id) {
  const t = await api(`suporte/${id}`);
  const form = $('#modalForm'); const dlg = $('#modal');
  const me = state.user?.id;
  const when = (x) => new Date(String(x).replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  form.innerHTML = `<h3>${esc(t.subject)}</h3>
    <div class="muted small">${t.user_id !== me ? `De ${esc(t.user_name)} (@${esc(t.user_login)}) · ` : ''}${t.status === 'fechado' ? 'Fechado' : t.status === 'respondido' ? 'Respondido' : 'Aguardando resposta'}</div>
    <div class="ticket-thread">${t.messages.map((m) => `<div class="tmsg ${m.user_id === me ? 'mine' : ''}"><div class="small muted">${m.from_admin ? 'Suporte' : esc(m.author || '')} · ${when(m.created_at)}</div><div>${esc(m.body).replace(/\n/g, '<br>')}</div></div>`).join('')}</div>
    ${t.status !== 'fechado' ? '<div class="field"><label for="tk_r">Responder</label><textarea id="tk_r" rows="3" maxlength="4000"></textarea></div>' : ''}
    <div class="error" id="formErr"></div>
    <div class="form-actions">${t.status !== 'fechado' ? '<button type="button" class="btn" id="tkClose">Marcar como resolvido</button>' : '<button type="button" class="btn" id="tkReopen">Reabrir</button>'}
      <div class="right"><button type="button" class="btn" id="cancelBtn">Fechar</button>${t.status !== 'fechado' ? '<button class="btn primary">Enviar</button>' : ''}</div></div>`;
  $('#cancelBtn').onclick = () => { dlg.close(); refresh(); };
  const st = async (status) => { await api(`suporte/${id}/status`, { method: 'POST', body: { status } }); dlg.close(); refresh(); };
  if ($('#tkClose')) $('#tkClose').onclick = () => st('fechado');
  if ($('#tkReopen')) $('#tkReopen').onclick = () => st('aberto');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const v = $('#tk_r')?.value.trim(); if (!v) return;
    try { await api(`suporte/${id}/reply`, { method: 'POST', body: { body: v } }); toast('Enviado'); openTicket(id); } catch (err) { $('#formErr').textContent = err.message; }
  };
  if (!dlg.open) dlg.showModal();
  const th = form.querySelector('.ticket-thread'); if (th) th.scrollTop = th.scrollHeight;
}

async function viewAssinaturas() {
  const o = await api(`subscriptions-overview?month=${state.month}`);
  const catName = Object.fromEntries(SUB_CATS); const methName = Object.fromEntries(SUB_METHODS);
  const dmy = (d) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '—');
  const live = o.list.filter((s) => s.live); const off = o.list.filter((s) => !s.live);
  const bars = (rows, names) => { const max = Math.max(...rows.map((r) => r[1]), 1); return rows.map(([k, v]) => `<div class="sub-bar"><span>${esc(names[k] || k)}</span><div class="progress"><span style="width:${(v / max) * 100}%"></span></div><b>${money(v)}</b></div>`).join('') || '<div class="muted small">—</div>'; };
  const row = (s) => `<div class="row clickable" data-edit-subscription="${s.id}" style="${s.live ? '' : 'opacity:.55'}">
      <div class="name">${subBadge(s)}<div style="min-width:0"><b>${esc(s.name)}</b>${s.plan ? ` <span class="muted small">· ${esc(s.plan)}</span>` : ''}
        <div class="muted small">${esc(s.paid_with)} · dia ${s.day || 1}${s.live && s.next ? ` · próxima ${dmy(s.next)}` : ''}${!s.live ? ` · cancelada${s.end_month ? ` em ${s.end_month.split('-').reverse().join('/')}` : ''}` : ''}</div></div></div>
      <div class="r"><span class="val">${money(s.amount)}</span><div class="muted small">${esc(s.cycle_txt)}${s.cycle !== 'mensal' ? ` · ${money(s.per_month)}/mês` : ''}${s.currency && s.currency !== 'BRL' && s.amount_original ? ` · ${s.currency === 'USD' ? 'US$' : '€'} ${String(s.amount_original).replace('.', ',')}` : ''}</div></div>
    </div>`;
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Assinaturas ${help('assinaturas')}</h2><p class="muted small" style="margin:4px 0 0;max-width:640px">Streaming, música, IA, apps, academia… Tudo que cobra sozinho todo mês ou todo ano. No cartão, entra sozinha na fatura; em Pix, débito, boleto ou dinheiro, aparece em Contas a pagar no dia.</p></div><button class="btn primary" data-form="subscription">+ Nova assinatura</button></div>
    <div class="grid-3" style="margin-top:12px">
      <div class="stat"><small>Por mês</small><b>${money(o.per_month)}</b><small>${o.active} ativa${o.active === 1 ? '' : 's'}</small></div>
      <div class="stat"><small>Por ano</small><b>${money(o.per_year)}</b><small>somando todas</small></div>
      <div class="stat"><small>Próxima cobrança</small><b style="font-size:16px">${o.next ? `${esc(o.next.name)} · ${dmy(o.next.next)}` : '—'}</b><small>${o.next ? money(o.next.amount) : ''}</small></div>
    </div>
  </section>
  <div class="grid-2">
    <section class="panel"><h2>Ativas</h2><div class="rows">${live.map(row).join('') || '<div class="empty">Nenhuma ainda. Cadastre a primeira em “+ Nova assinatura”.</div>'}</div></section>
    <div style="display:grid;gap:16px;align-content:start">
      <section class="panel"><h2>Por tipo</h2>${bars(o.by_category, catName)}</section>
      <section class="panel"><h2>Por forma de pagamento</h2>${bars(o.by_method, methName)}</section>
    </div>
  </div>
  ${off.length ? `<section class="panel"><h2>Canceladas</h2><div class="rows">${off.map(row).join('')}</div></section>` : ''}`;
}

async function viewLembretes(d) {
  const list = await api('reminders');
  const items = d.to_pay.items.filter((i) => i.type === 'reminder');
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const desc = (r) => ({ semanal: `toda ${DIAS[r.weekday]}`, quinzenal: `a cada 15 dias (${DIAS[r.weekday]})`, mensal: `todo dia ${r.day}`, diaria: 'todo dia', unica: `em ${String(r.start_date || '').split('-').reverse().join('/')}` }[r.frequency] || '') + (r.time ? ` até ${r.time}` : '');
  const accName = (id) => (d.accounts?.list || []).find((a) => a.id === id)?.name || 'dinheiro';
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Pagamentos recorrentes ${help('lembretes')}</h2><p class="muted small" style="margin:4px 0 0">Ex.: pedreiro toda sexta até 12h. Cada vez aparece em Contas a pagar e você recebe o lembrete no dia.</p></div><button class="btn primary" data-form="reminder">+ Novo</button></div>
    <div class="rows" style="margin-top:8px">${list.map((r) => `<div class="row clickable" ${r.subscription_id ? `data-edit-subscription="${r.subscription_id}"` : `data-edit-reminder="${r.id}"`} style="${r.active ? '' : 'opacity:.5'}"><div class="name">${illus('relogio', 'sv-ic')}<div style="min-width:0"><b>${esc(r.name)}</b><div class="muted small">${desc(r)} · ${accName(r.account_id)}</div></div></div><span class="val">${money(r.amount)}</span></div>`).join('') || '<div class="empty">Nenhum ainda</div>'}</div>
  </section>
  <section class="panel">
    <h2>Em ${monthName(state.month).toLowerCase()}</h2>
    <div class="rows">${items.map((i) => `<div class="row ${i.paid ? 'done' : ''}"><div class="name"><button class="check ${i.paid ? 'on' : ''}" data-pay="reminder:${i.id}:${i.paid ? 0 : 1}:${i.date}">${i.paid ? I.check : ''}</button><button class="link-plain" data-payitem="reminder:${i.id}:${i.date}">${esc(i.name)}${i.adjusted ? ' <span class="pill amber">ajustado</span>' : ''}</button></div><span class="val">${money(i.amount)}</span></div>`).join('') || '<div class="empty">Nada neste mês</div>'}</div>
    <p class="muted small">Toque no nome para pagar com outro valor, ajustar só aquela vez ou pular.</p>
  </section>`;
}

async function viewNotificacoes() {
  const { prefs: p, devices } = await api('notify-prefs');
  const sw = (k, label, extra = '') => `<label class="pref"><input type="checkbox" name="${k}" ${p[k] ? 'checked' : ''}><span><b>${label}</b>${extra}</span></label>`;
  return `
  <section class="panel">
    <h2>Notificações no celular</h2>
    <p class="muted small" style="margin:0 0 10px">Receba os avisos como notificação do celular. No iPhone, primeiro adicione o app à tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá.</p>
    ${pushSupported() ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="pushBtn">Ativar neste aparelho</button><button class="btn" id="pushTestBtn">Enviar teste</button></div>' : `<div class="alert-bad" style="background:var(--amber-soft);color:#b45309">${window.__bootDemo ? 'Na versão de teste o push não funciona; instalado no servidor (https) funciona.' : 'Este navegador não aceita notificações push. Use o Chrome/Android ou o app instalado no iPhone.'}</div>`}
    <div class="label-caps">Aparelhos ativados</div>
    <div class="rows">${devices.map((x) => `<div class="row"><span>${esc(x.device)} <span class="muted small">desde ${esc(String(x.created_at).slice(0, 10).split('-').reverse().join('/'))}</span></span><button class="btn sm danger" data-del-device="${x.id}">Remover</button></div>`).join('') || '<div class="muted small">Nenhum ainda.</div>'}</div>
  </section>
  <section class="panel">
    <h2>O que avisar</h2>
    <form id="prefsForm" class="prefs">
      ${sw('contas', 'Contas vencendo', `<small>Contas fixas, faturas, parcelas e depósitos da poupança.</small><span class="inline">Avisar <input type="number" name="dias_antes" min="0" max="7" value="${p.dias_antes}"> dia(s) antes, às <input type="time" name="hora" value="${p.hora}"></span>`)}
      ${sw('lembretes', 'Pagamentos recorrentes', '<small>Na hora marcada em cada um (ex.: pedreiro sexta 12h).</small>')}
      ${sw('limite', 'Limite do cartão acabando', `<span class="inline">Quando passar de <input type="number" name="limite_pct" min="10" max="100" value="${p.limite_pct}">% do limite</span>`)}
      ${sw('saldo', 'Saldo baixo ou conta no vermelho', `<span class="inline">Saldo mínimo: R$ <input type="number" name="saldo_minimo" step="0.01" value="${p.saldo_minimo}"></span>`)}
      ${sw('receitas', 'Receitas e contratos', '<small>Recebimento atrasado há mais de 3 dias e contrato terminando em 15 dias (quando marcado “me avisar”).</small>')}
      ${sw('salario', 'Dia do salário', '<small>No dia em que o salário cai, com o saldo e a sugestão de guardar.</small>')}
      ${sw('resumo', 'Resumo do dia', `<small>Quanto tem em conta, quanto dá para gastar por dia sem fechar no vermelho e a média de entrada e saída.</small><span class="inline">às <input type="time" name="resumo_hora" value="${p.resumo_hora}"></span>`)}
      ${sw('push', 'Mandar também para o celular', '<small>Desligado: os avisos ficam só no sininho do app.</small>')}
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary">Salvar</button><button type="button" class="btn" id="checkNowBtn">Verificar agora</button></div>
    </form>
  </section>`;
}

async function viewBens(d) {
  const det = await Promise.all(d.assets.list.map((a) => api(`asset-detail/${a.id}`)));
  const nw = d.networth;
  const open = state.assetOpen;
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Patrimônio ${help('patrimonio')}</h2>${big(nw.total, 'xl')}<div class="muted small">bens ${money(nw.assets)} + contas ${money(nw.accounts)} + poupança ${money(nw.savings)} − dívidas ${money(nw.debts)}</div></div><button class="btn primary" data-form="asset">+ Bem</button></div>
  </section>
  <div class="assets-grid">${det.map((a) => `
    <section class="panel asset-card">
      <div class="panel-head"><div style="min-width:0"><h2 style="margin:0">${esc(a.name)}</h2><div class="muted small">${esc((a.kind === 'veiculo' || a.kind === 'outro' ? [a.brand, a.model, a.year] : [a.address, a.kind === 'imovel' && a.year ? `construído em ${a.year}` : '']).filter(Boolean).join(a.kind === 'veiculo' || a.kind === 'outro' ? ' ' : ' · ') || ASSET_KINDS.find((k) => k[0] === a.kind)?.[1] || '')}${a.kind === 'veiculo' && a.plate ? ` · ${esc(a.plate)}` : ''}${a.area ? ` · ${String(a.area).replace('.', ',')} m²` : ''}</div></div>${illus(assetIcon(a.kind), 'illus')}</div>
      <div class="asset-val"><small>Valor de mercado${a.value_date ? ` · ${a.value_date.split('-').reverse().join('/')}` : ''}</small>${big(a.market_value || 0, 'md')}
        ${a.change != null ? `<span class="pill ${a.change >= 0 ? 'green' : 'amber'}">${a.change >= 0 ? I.up : I.down} ${money(Math.abs(a.change))} (${Math.round(a.change_pct)}%) desde a compra</span>` : ''}</div>
      <div class="asset-facts">
        <div><small>Já pago ${help('japago')}</small><b>${money(a.paid)}</b></div>
        <div><small>Falta pagar ${help('faltapagar')}</small><b class="${a.to_pay ? '' : 'good'}">${money(a.to_pay)}</b></div>
        <div><small>Líquido (valor − falta) ${help('liquido')}</small><b>${money(a.net)}</b></div>
        <div><small>Gasto médio/mês ${help('gastomedio')}</small><b>${money(a.per_month)}</b></div>
      </div>
      ${a.remaining.length ? `<div class="label-caps">Falta pagar</div><div class="rows">${a.remaining.map((r) => `<div class="row"><span>${esc(r.desc)} <span class="muted small">${esc(r.detail)}</span></span><span class="val">${money(r.amount)}</span></div>`).join('')}</div>` : ''}
      ${Object.keys(a.by_category).length ? `<div class="label-caps">Gastos por tipo</div><div class="cat-bars">${Object.entries(a.by_category).sort((x, y) => y[1] - x[1]).map(([c, v]) => `<div><div class="row" style="border:0;padding:2px 0"><span class="small">${esc(c)}</span><span class="small"><b>${money(v)}</b></span></div><div class="progress" style="height:6px;margin:0 0 6px"><span style="width:${(v / Math.max(...Object.values(a.by_category))) * 100}%;background:var(--blue)"></span></div></div>`).join('')}</div>` : ''}
      ${open === a.id ? `<div class="label-caps">Lançamentos vinculados</div><div class="rows">${a.entries.map((e) => `<div class="row"><span class="small">${e.date.split('-').reverse().join('/')} · ${esc(e.desc)} <span class="pill gray">${esc(e.category)}</span></span><span class="val small">${money(e.amount)}</span></div>`).join('') || '<div class="muted small">Nada ainda. Ao lançar um gasto, escolha este bem.</div>'}</div>
        ${a.history.length > 1 ? `<div class="label-caps">Histórico de valor</div>${valueChart(a.history)}` : ''}` : ''}
      <div class="asset-actions">
        <button class="btn sm" data-asset-open="${a.id}">${open === a.id ? 'Menos detalhes' : 'Ver lançamentos'}</button>
        <button class="btn sm" data-asset-value="${a.id}">Atualizar valor</button>
        ${a.kind === 'veiculo' ? `<button class="btn sm" data-fipe="${a.id}">${a.fipe_code ? 'Atualizar FIPE' : 'Buscar na FIPE'}</button>` : ''}
        <button class="btn sm" data-form="transaction" data-asset="${a.id}">+ Gasto</button>
        <button class="link-btn" data-edit-asset="${a.id}">Editar</button>
      </div>
    </section>`).join('') || `<section class="panel empty">${illus('carro')}<p>Cadastre seu carro, sua casa ou seu lote para acompanhar o valor e os gastos.</p><button class="btn primary" data-form="asset">+ Bem</button></section>`}</div>`;
}

function valueChart(h) {
  const W = 320; const H = 90; const vals = h.map((x) => x.value);
  const min = Math.min(...vals) * 0.95; const max = Math.max(...vals) * 1.02;
  const pts = h.map((x, i) => [h.length === 1 ? W / 2 : (i / (h.length - 1)) * (W - 20) + 10, H - 18 - ((x.value - min) / (max - min || 1)) * (H - 30)]);
  return `<svg class="value-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Histórico de valor">
    <path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')}" fill="none" stroke="var(--blue)" stroke-width="2"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--panel)" stroke="var(--blue)" stroke-width="2"/><text x="${p[0]}" y="${H - 4}" font-size="9" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}" fill="var(--muted)">${h[i].date.slice(0, 7).split('-').reverse().join('/')} · ${Math.round(h[i].value / 1000)}k</text>`).join('')}
  </svg>`;
}

function openAssetValue(a) {
  const form = $('#modalForm'); const dlg = $('#modal');
  form.innerHTML = `<h3>Atualizar valor: ${esc(a.name)}</h3>
    <div class="form-row"><div class="field"><label for="av_v">Valor de mercado (R$)</label><input id="av_v" type="number" step="0.01" inputmode="decimal" value="${a.market_value || ''}" required></div>
    <div class="field"><label for="av_d">Data</label><input id="av_d" type="date" value="${today()}" required></div></div>
    <div class="field"><label for="av_s">Fonte</label><input id="av_s" value="avaliação" list="av_l"><datalist id="av_l"><option value="avaliação"><option value="FIPE"><option value="corretor"><option value="anúncio"></datalist></div>
    <div class="error" id="formErr"></div>
    <div class="form-actions"><div class="right"><button type="button" class="btn" id="cancelBtn">Cancelar</button><button class="btn primary">Salvar</button></div></div>`;
  $('#cancelBtn').onclick = () => dlg.close();
  form.oninput = null;
  form.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('asset-value', { method: 'POST', body: { id: a.id, value: $('#av_v').value, date: $('#av_d').value, source: $('#av_s').value } }); dlg.close(); toast('Valor atualizado'); refresh(); } catch (err) { $('#formErr').textContent = err.message; }
  };
  dlg.showModal();
}

// Busca na FIPE: marca → modelo → ano. Salva código e ano no bem e atualiza o valor.
async function openFipe(a) {
  const form = $('#modalForm'); const dlg = $('#modal');
  const type = a.fipe_type || 'cars';
  if (a.fipe_code && a.fipe_year) {
    try { const r = await api('asset-value', { method: 'POST', body: { id: a.id, fipe: true } }); toast(`FIPE: ${money(r.value)}`); return refresh(); } catch (err) { toast(err.message); }
  }
  form.innerHTML = `<h3>Buscar na FIPE</h3>
    <p class="muted small" style="margin:0">Escolha marca, modelo e ano. O valor da tabela FIPE vira o valor de mercado do bem.</p>
    <div class="field"><label for="fp_b">Marca</label><select id="fp_b"><option>Carregando…</option></select></div>
    <div class="field"><label for="fp_m">Modelo</label><select id="fp_m" disabled></select></div>
    <div class="field"><label for="fp_y">Ano</label><select id="fp_y" disabled></select></div>
    <div class="error" id="formErr"></div>
    <div class="form-actions"><div class="right"><button type="button" class="btn" id="cancelBtn">Cancelar</button><button class="btn primary" id="fp_ok" disabled>Usar este valor</button></div></div>`;
  $('#cancelBtn').onclick = () => dlg.close();
  dlg.showModal();
  const opts = (list, ph) => `<option value="">${ph}</option>${list.map((x) => `<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('')}`;
  const err = (e) => { $('#formErr').textContent = `${e.message}. Sem internet no servidor? Informe o valor em “Atualizar valor”.`; };
  try { $('#fp_b').innerHTML = opts(await api(`fipe/${type}/brands`), 'Escolha a marca'); } catch (e) { $('#fp_b').innerHTML = '<option>—</option>'; return err(e); }
  let picked = null;
  $('#fp_b').onchange = async (e) => { $('#fp_m').disabled = true; $('#fp_y').disabled = true; try { $('#fp_m').innerHTML = opts(await api(`fipe/${type}/brands/${e.target.value}/models`), 'Escolha o modelo'); $('#fp_m').disabled = false; } catch (x) { err(x); } };
  $('#fp_m').onchange = async (e) => { $('#fp_y').disabled = true; try { $('#fp_y').innerHTML = opts(await api(`fipe/${type}/brands/${$('#fp_b').value}/models/${e.target.value}/years`), 'Escolha o ano'); $('#fp_y').disabled = false; } catch (x) { err(x); } };
  $('#fp_y').onchange = async (e) => {
    try {
      picked = await api(`fipe/${type}/brands/${$('#fp_b').value}/models/${$('#fp_m').value}/years/${e.target.value}`);
      $('#formErr').innerHTML = `<span class="good">${esc(picked.model || '')} ${esc(String(picked.modelYear || ''))}: ${esc(picked.price || '')} (ref. ${esc(picked.referenceMonth || '')})</span>`;
      $('#fp_ok').disabled = false;
    } catch (x) { err(x); }
  };
  form.oninput = null;
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!picked) return;
    await api(`assets/${a.id}`, { method: 'PUT', body: { fipe_type: type, fipe_code: picked.codeFipe, fipe_year: $('#fp_y').value, brand: picked.brand || a.brand, model: picked.model || a.model, year: String(picked.modelYear || a.year || '') } });
    await api('asset-value', { method: 'POST', body: { id: a.id, value: Number(String(picked.price).replace(/[^\d,]/g, '').replace(',', '.')), date: today(), source: `FIPE ${picked.referenceMonth || ''}`.trim() } });
    dlg.close(); toast('Valor FIPE salvo'); refresh();
  };
}

async function viewConexoes(d) {
  if (window.__bootDemo) return `<section class="panel"><h2>Bancos conectados</h2><div class="alert-bad" style="background:var(--amber-soft);color:#b45309">Na versão de teste não dá para conectar bancos. Instalado no servidor, esta tela puxa as movimentações das suas contas e cartões pelo Open Finance (MeuPluggy, gratuito).</div></section>`;
  const o = await api('openfinance');
  const c = o.config;
  const accs = d.accounts?.list || []; const cards = d.cards || [];
  const dmy = (x) => (x ? new Date(x).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'nunca');
  const typeTxt = (a) => (a.type === 'CREDIT' ? 'Cartão de crédito' : a.subtype === 'SAVINGS_ACCOUNT' ? 'Poupança' : 'Conta');
  const accRow = (a) => `<div class="of-acc">
      <div style="min-width:0"><b>${esc(a.name)}</b> <span class="muted small">${typeTxt(a)}${a.number ? ` · ${esc(a.number)}` : ''}</span>
        <div class="muted small">${a.type === 'CREDIT' ? `fatura ${money(a.balance || 0)}${a.available != null ? ` · livre ${money(a.available)} de ${money(a.credit_limit || 0)}` : ''}` : `saldo no banco ${money(a.balance || 0)}`}${a.last_sync ? ` · sincronizado ${dmy(a.last_sync)}` : ''}</div>
        ${a.diff != null && Math.abs(a.diff) >= 0.01 ? `<div class="small">No app: ${money(a.app_balance)} · <span class="${a.diff < 0 ? 'neg' : 'good'}">diferença ${money(a.diff)}</span> <button class="link-btn" data-of-adjust="${a.id}">Ajustar para bater com o banco</button></div>` : a.diff != null ? '<div class="small good">Saldo igual ao do banco ✓</div>' : ''}</div>
      <div class="of-link">
        <select data-of-link="${a.id}" aria-label="O que fazer com ${esc(a.name)}">
          <option value="pendente" ${a.link === 'pendente' ? 'selected' : ''}>Escolher…</option>
          ${a.type === 'CREDIT' ? `<option value="cartao" ${a.link === 'cartao' ? 'selected' : ''}>Ligar ao cartão do app</option>` : `<option value="conta" ${a.link === 'conta' ? 'selected' : ''}>Ligar à conta do app</option>`}
          <option value="ignorar" ${a.link === 'ignorar' ? 'selected' : ''}>Não importar</option>
        </select>
        ${a.type === 'CREDIT'
          ? `<select data-of-card="${a.id}" ${a.link === 'ignorar' ? 'disabled' : ''}><option value="">Cartão…</option>${cards.map((x) => `<option value="${x.id}" ${a.card_id === x.id ? 'selected' : ''}>${esc(`${x.bank || ''} ${x.name}`.trim())}</option>`).join('')}</select>`
          : `<select data-of-account="${a.id}" ${a.link === 'ignorar' ? 'disabled' : ''}><option value="">Conta…</option>${accs.map((x) => `<option value="${x.id}" ${a.account_id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`}
      </div>
    </div>`;
  const run = (r) => { const sm = r.summary || {}; return `<div class="row" style="${r.undone ? 'opacity:.5' : ''}"><div style="min-width:0"><b class="small">${dmy(r.started_at.replace(' ', 'T') + 'Z')}</b> <span class="muted small">${r.mode === 'auto' ? 'automática' : 'manual'}${r.undone ? ' · desfeita' : ''}</span>
      <div class="muted small">${sm.criados || 0} lançamentos · ${sm.compras || 0} compras no cartão · ${sm.recebimentos || 0} recebimentos · ${sm.contas_pagas || 0} contas pagas · ${sm.ligados || 0} já existiam${(sm.erros || []).length ? ` · <span class="neg">${sm.erros.length} erro(s)</span>` : ''}</div></div>
      ${r.undone ? '' : `<button class="btn sm" data-of-undo="${r.id}">Desfazer</button>`}</div>`; };
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Bancos conectados ${help('openfinance')}</h2><p class="muted small" style="margin:4px 0 0;max-width:680px">Puxa as movimentações das suas contas e cartões pelo Open Finance (via MeuPluggy, gratuito para uso pessoal): Pix, débito, boletos, compras no cartão e parcelas entram sozinhos, sem duplicar o que você já lançou. Você só lança o que for em dinheiro.</p></div>
      ${o.items.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-of-sync="dry">Ver prévia</button><button class="btn primary" data-of-sync="real">Sincronizar agora</button></div>' : ''}</div>
    <div id="ofResult"></div>
  </section>
  <section class="panel">
    <details ${c.has_secret ? '' : 'open'}><summary><b>1. Criar a chave na Pluggy (uma vez)</b></summary>
      <ol class="small" style="line-height:1.7;margin:10px 0 0;padding-left:18px">
        <li>Crie sua conta em <a href="https://meu.pluggy.ai" target="_blank" rel="noopener">meu.pluggy.ai</a> e conecte seus bancos (botão conectar → autorize no app do banco).</li>
        <li>Crie uma conta de desenvolvedor em <a href="https://dashboard.pluggy.ai" target="_blank" rel="noopener">dashboard.pluggy.ai</a>.</li>
        <li>No painel, na sua Application, crie uma <b>Development Application</b> e copie o <b>Client ID</b> e o <b>Client Secret</b>.</li>
        <li>No painel, abra o app <b>Demo</b> e conecte usando <b>MeuPluggy</b> (autorização do MeuPluggy) — uma vez para cada banco.</li>
        <li>Copie o <b>Item ID</b> de cada conexão (aparece no fim da conexão / na lista de conexões do painel) e cole abaixo.</li>
      </ol></details>
    <form id="ofConfig" class="prefs" style="margin-top:12px">
      <div class="form-row">
        <div class="field"><label for="of_cid">Client ID</label><input id="of_cid" name="client_id" value="${esc(c.client_id)}" autocomplete="off" spellcheck="false"></div>
        <div class="field"><label for="of_sec">Client Secret</label><input id="of_sec" name="client_secret" type="password" placeholder="${c.has_secret ? '•••••••• guardado no servidor' : ''}" autocomplete="new-password"><span class="hint">Fica só no seu servidor; nunca aparece de novo.</span></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="of_since">Importar a partir de</label><input id="of_since" name="since" type="date" value="${esc(c.since)}"><span class="hint">Na primeira vez. Depois, só o que for novo.</span></div>
        <div class="field" style="display:grid;gap:6px;align-content:end">
          <label class="of-check"><input type="checkbox" name="auto" ${c.auto ? 'checked' : ''}> Sincronizar sozinho 1× por dia</label>
          <label class="of-check"><input type="checkbox" name="pending" ${c.pending ? 'checked' : ''}> Importar também as pendentes</label>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary">Salvar</button>${c.has_secret ? '<button type="button" class="btn" id="ofTest">Testar chave</button>' : ''}</div>
    </form>
  </section>
  ${c.has_secret ? `<section class="panel">
    <h2>2. Conexões</h2>
    <form id="ofAddItem" class="form-row" style="align-items:end;margin-bottom:12px">
      <div class="field"><label for="of_item">Item ID da conexão</label><input id="of_item" name="item_id" placeholder="ex.: 7c0d…-…-…" required spellcheck="false" autocomplete="off"></div>
      <div class="field"><label for="of_iname">Nome</label><input id="of_iname" name="name" placeholder="Ex.: Sicredi do Diego"></div>
      <div class="field"><button class="btn primary">Adicionar</button></div>
    </form>
    ${o.items.map((it) => `<div class="inc-card">
      <div class="inc-head"><div><b>${esc(it.name)}</b> <span class="muted small">${esc(it.connector || '')}${it.status ? ` · ${esc(it.status)}` : ''}</span>${it.error ? `<div class="small neg">${esc(it.error)}</div>` : ''}</div>
        <div class="inc-actions"><button class="btn sm" data-of-refresh="${esc(it.item_id)}">Atualizar contas</button><button class="btn sm danger" data-of-del="${esc(it.item_id)}">Remover</button></div></div>
      ${it.accounts.map(accRow).join('') || '<div class="muted small">Nenhuma conta encontrada nesta conexão.</div>'}
    </div>`).join('') || '<div class="empty">Nenhuma conexão ainda. Cole o Item ID acima.</div>'}
    <p class="muted small" style="margin-top:8px">Ligue cada conta do banco a uma conta (ou cartão) do app. Só as ligadas são importadas.</p>
  </section>` : ''}
  ${o.runs.length ? `<section class="panel"><h2>Sincronizações</h2><div class="rows">${o.runs.map(run).join('')}</div>
    <p class="muted small">Desfazer apaga o que aquela sincronização criou e solta o que ela só ligou (nada que você lançou à mão é apagado).</p></section>` : ''}`;
}

async function viewServidor() {
  const u = await api('server-usage');
  if (u.demo) return '<section class="panel"><h2>Uso do servidor</h2><div class="alert-bad" style="background:var(--amber-soft);color:#b45309">Na versão de teste não há servidor para medir. Instalado, esta tela mostra disco, dados, usuários e memória.</div></section>';
  const sz = (n) => (n >= 1073741824 ? `${(n / 1073741824).toFixed(1).replace('.', ',')} GB` : n >= 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const up = (s) => (s >= 86400 ? `${Math.floor(s / 86400)} dia(s)` : s >= 3600 ? `${Math.floor(s / 3600)} h` : `${Math.max(1, Math.floor(s / 60))} min`);
  const d = u.disk; const memUsed = u.system.memory_total - u.system.memory_free; const memPct = Math.round((memUsed / u.system.memory_total) * 100);
  const bar = (pct) => `<div class="progress" style="height:10px"><span style="width:${Math.min(100, pct)}%;background:${pct >= 95 ? 'var(--red)' : pct >= 85 ? '#f59e0b' : 'var(--blue)'}"></span></div>`;
  const max = Math.max(...u.spaces.map((x) => x.size), 1);
  return `
  <section class="panel">
    <h2>Uso do servidor ${help('servidor')}</h2>
    <p class="muted small" style="margin:4px 0 0;max-width:680px">Quanto do seu servidor o Casa em Dia está usando e se está perto de algum limite. Só o administrador do servidor vê esta tela.</p>
    ${u.alerts.map((a) => `<div class="alert-bad" style="margin-top:12px;${a.level === 'amber' ? 'background:var(--amber-soft);color:#b45309' : ''}">${esc(a.text)}</div>`).join('') || '<div class="of-result" style="margin-top:12px">Tudo dentro do normal ✓</div>'}
    <div class="grid-3" style="margin-top:12px">
      <div class="stat"><small>Disco do servidor</small><b>${d ? `${String(d.used_pct).replace('.', ',')}% usado` : '—'}</b>${d ? `${bar(d.used_pct)}<small>livre ${sz(d.free)} de ${sz(d.total)}</small>` : '<small>não foi possível medir</small>'}</div>
      <div class="stat"><small>O app ocupa</small><b>${sz(u.sizes.total)}</b><small>dados ${sz(u.sizes.data)} · backups ${sz(u.sizes.backups)}${u.sizes.app ? ` · versões ${sz(u.sizes.app)}` : ''}</small></div>
      <div class="stat"><small>No ritmo atual, o disco dura</small><b>${u.months_left == null ? 'ainda medindo' : u.months_left > 240 ? 'mais de 20 anos' : u.months_left >= 24 ? `${Math.floor(u.months_left / 12)} anos` : `${u.months_left} meses`}</b><small>${u.growth ? `os dados crescem ${sz(u.growth)} por mês` : 'precisa de alguns dias de uso para estimar'}</small></div>
    </div>
  </section>
  <div class="grid-2">
    <section class="panel"><h2>Usuários</h2>
      <div class="grid-3">
        <div class="stat"><small>Ativos</small><b>${u.users.active}</b></div>
        <div class="stat"><small>Aguardando aprovação</small><b class="${u.users.pending ? 'warn' : ''}">${u.users.pending}</b></div>
        <div class="stat"><small>Entraram em 7 dias</small><b>${u.activity.logins_7d}</b></div>
      </div>
      <p class="muted small" style="margin-top:10px">${u.users.total} cadastro(s) no total · ${u.users.blocked} bloqueado(s) · ${u.users.spaces} conta(s) de dados · ${u.activity.sessions} aparelho(s) conectado(s) · ${u.activity.tokens} chave(s) de IA${u.users.pending ? ' · <a href="#acessos">aprovar pedidos</a>' : ''}</p>
    </section>
    <section class="panel"><h2>Memória e sistema</h2>
      <div class="stat"><small>Memória do servidor</small><b>${memPct}% usada</b>${bar(memPct)}<small>${sz(memUsed)} de ${sz(u.system.memory_total)} · o app usa ${sz(u.system.app_memory)}</small></div>
      <p class="muted small" style="margin-top:10px">Processador: ${u.system.cpus} núcleo(s), carga ${String(Math.round(u.system.load * 100) / 100).replace('.', ',')} · app ligado há ${up(u.system.uptime)} · Node ${esc(u.system.node)}</p>
    </section>
  </div>
  <section class="panel"><h2>Espaço por conta</h2>
    ${u.spaces.map((x) => `<div class="sub-bar"><span><b>${esc(x.name)}</b> <span class="muted small">${esc(x.users.join(', ') || '—')}</span></span><div class="progress"><span style="width:${(x.size / max) * 100}%"></span></div><b>${sz(x.size)}</b></div>`).join('')}
    <p class="muted small" style="margin-top:8px">Cada conta separada é um arquivo próprio. Fotos de perfil e de cartões são o que mais pesa.</p>
  </section>`;
}

async function viewBackup() {
  const b = await api('backups');
  const up = b.demo ? null : await api('update').catch(() => null);
  const fmtDate = (iso) => { const d = new Date(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const size = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.round(n / 1024)} KB`);
  const reasonLabel = { auto: 'automático', manual: 'manual', 'antes-de-restaurar': 'antes de restaurar', 'antes-de-atualizar': 'antes de atualizar o app' };
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Backup</h2><p class="muted small" style="margin:4px 0 0;max-width:640px">Cópia completa de tudo (contas, cartões, usuários, configurações). Já vem ligado: se o servidor desligar ou der problema, você restaura daqui.</p></div>
      ${b.demo ? '' : '<button class="btn primary" id="backupNowBtn">Fazer backup agora</button>'}</div>
    ${b.demo ? '<div class="alert-bad" style="background:var(--amber-soft);color:#b45309">Na versão da nuvem, o Supabase guarda uma cópia do banco todo dia. Para ter uma cópia sua, use “Exportar .json” logo abaixo.</div>' : `
    <div class="grid-3" style="margin-top:12px">
      <div class="stat"><small>Último backup</small><b style="font-size:16px">${b.last ? fmtDate(b.last.at) : 'ainda nenhum'}</b>${b.last ? `<small>${reasonLabel[b.last.reason] || b.last.reason} · ${size(b.last.size)}</small>` : ''}</div>
      <div class="stat"><small>Próximo automático</small><b style="font-size:16px">${b.backup_enabled && b.next ? fmtDate(b.next) : 'desligado'}</b></div>
      <div class="stat"><small>Guardados</small><b style="font-size:16px">${b.list.length} de ${b.backup_keep}</b><small>${b.extra_dir ? 'com cópia em outro disco' : 'sem cópia em outro disco'}</small></div>
    </div>`}
  </section>
  ${up ? `<section class="panel">
    <h2>Atualizar o app</h2>
    <p class="muted small" style="margin:4px 0 10px;max-width:680px">Versão instalada: <b>${esc(up.version)}</b> (${up.from === 'enviada' ? 'enviada por aqui' : 'da pasta do servidor'}). Recebeu um zip novo? Envie aqui: o app confere o arquivo, faz um backup e reinicia sozinho em alguns segundos. Se a versão nova não abrir, ele volta sozinho para a que estava.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <label class="btn primary">${I.upload} Enviar zip da nova versão<input type="file" id="updateFile" accept=".zip,application/zip" hidden></label>
      ${up.previous ? `<button class="btn" id="rollbackBtn">Voltar para a versão ${esc(up.previous)}</button>` : ''}
    </div>
    <div class="muted small" id="updateMsg" style="margin-top:8px"></div>
  </section>` : ''}
  ${b.demo ? '' : `
  <div class="grid-2">
    <section class="panel">
      <h2>Configurações</h2>
      <form id="backupForm" class="prefs">
        <label class="pref"><input type="checkbox" name="backup_enabled" ${b.backup_enabled ? 'checked' : ''}><span><b>Backup automático</b><small>Recomendado deixar ligado.</small></span></label>
        <div class="form-row">
          <div class="field"><label for="bk_every">Frequência</label><select id="bk_every" name="backup_every_hours">${[[6, 'A cada 6 horas'], [12, 'A cada 12 horas'], [24, 'Todo dia'], [168, 'Toda semana']].map(([v, l]) => `<option value="${v}" ${Number(b.backup_every_hours) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="bk_time">Horário</label><input id="bk_time" type="time" name="backup_time" value="${esc(b.backup_time)}"><span class="hint">Para diário/semanal</span></div>
        </div>
        <div class="field"><label for="bk_keep">Quantos guardar</label><input id="bk_keep" type="number" min="1" max="365" name="backup_keep" value="${b.backup_keep}"><span class="hint">Os mais antigos são apagados</span></div>
        <div class="field"><label for="bk_extra">Cópia em outra pasta/disco (opcional)</label><input id="bk_extra" name="backup_extra_dir" value="${esc(b.extra_dir || '')}" placeholder="/backup-extra"><span class="hint">Pasta dentro do container ligada a outro disco no docker-compose (ver README)</span></div>
        <div class="muted small">Pasta principal: <code>${esc(b.dir)}</code></div>
        ${b.key ? `<div class="muted small">Chave de criptografia dos backups: ${b.key.error ? `<span class="neg">${esc(b.key.error)}</span>` : `${b.key.source === 'APP_KEY' ? 'variável APP_KEY' : `arquivo <code>${esc(b.key.file)}</code>`} · impressão digital <b>${esc(b.key.fingerprint)}</b>`}. Guarde uma cópia da chave fora do servidor.</div>` : ''}
        <div><button class="btn primary">Salvar</button></div>
      </form>
    </section>
    <section class="panel">
      <h2>Backups guardados</h2>
      <div class="rows">${b.list.map((x) => `<div class="row"><div style="min-width:0"><b class="small">${fmtDate(x.date)}</b><div class="muted small">${reasonLabel[x.reason] || x.reason} · ${size(x.size)}</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><a class="btn sm" href="/api/backups/download/${encodeURIComponent(x.name)}" download>Baixar</a><button class="btn sm" data-restore="${esc(x.name)}">Restaurar</button><button class="btn sm danger" data-del-backup="${esc(x.name)}">Excluir</button></div></div>`).join('') || '<div class="empty">Nenhum ainda</div>'}</div>
    </section>
  </div>`}
  <section class="panel">
    <h2>Exportar / importar (arquivo .json)</h2>
    <p class="muted small" style="margin-top:0">Para levar os dados para outro servidor. Não inclui usuários e senhas.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a class="btn" href="/api/export" download>${I.download} Exportar .json</a>
      <label class="btn">${I.upload} Importar .json<input type="file" id="importFile" accept="application/json" hidden></label>
      <button class="btn danger" id="resetBtn">Apagar todos os dados</button>
    </div>
  </section>`;
}

function viewAjuda() {
  const S = [
    ['Faça seu cadastro', 'No primeiro acesso, informe nome, foto, salário e troque a senha.', null],
    ['Cadastre suas contas bancárias', 'Em Contas bancárias: banco, saldo de hoje e o dia do salário. O salário entra sozinho todo mês.', ['#bancarias', 'Contas bancárias']],
    ['Cadastre seus cartões', 'Em Cartões: banco (a cor vem sozinha), limite, fechamento e vencimento. Fatura em débito automático? Vincule à conta.', ['#cartoes', 'Cartões']],
    ['Cadastre as contas fixas', 'Em Cadastros → Contas fixas: aluguel, luz, internet… Escolha se é da casa (dividida) ou pessoal, e de qual conta sai.', ['#contas', 'Contas fixas']],
    ['Lance receitas e despesas', 'No botão “+ Adicionar”: gasto ou entrada (Pix, débito, dinheiro), compra no cartão (parcelada) e mais.', null],
    ['Acompanhe o mês no painel', 'Visão geral mostra o saldo previsto, o que vence, quanto dá para gastar por dia, cartões e dívidas. Marque as contas como pagas.', ['#visao', 'Visão geral']],
    ['Guarde dinheiro', 'Em Poupança, crie caixinhas com meta. Ao lançar uma entrada, o app pergunta quanto guardar.', ['#reserva', 'Poupança']],
    ['Empréstimos, pagamentos recorrentes e bens', 'Cadastre empréstimos (com antecipação), pagamentos que se repetem (ex.: pedreiro toda sexta) e seus bens (carro, casa, lote).', ['#emprestimos', 'Empréstimos']],
    ['Ative as notificações', 'Em Notificações, escolha os avisos e ative no celular (app instalado na tela de início).', ['#notificacoes', 'Notificações']],
    ['Convide quem divide a casa', 'Em Acessos (administrador), crie o acesso da outra pessoa e escolha o nível.', ['#acessos', 'Acessos']],
  ];
  return `
  <section class="panel">
    <div class="page-head"><div><h2>Como usar o Casa em Dia</h2><p class="muted small" style="margin:4px 0 0">Siga nesta ordem na primeira vez. Depois é só lançar o dia a dia e acompanhar o painel.</p></div><button class="btn primary" id="tourBtn">Fazer o tour guiado</button></div>
    <ol class="howto">${S.map(([t, x, l], i) => `<li><span class="num">${i + 1}</span><div style="min-width:0;flex:1"><b>${t}</b><p>${x}</p></div>${l ? `<a class="btn sm" href="${l[0]}">${l[1]}</a>` : ''}</li>`).join('')}</ol>
  </section>
  <section class="panel">
    <h2>Dicas</h2>
    <ul class="ia-list">
      <li>O <b>?</b> ao lado dos títulos explica cada número: passe o mouse ou toque.</li>
      <li>Em <b>Contas a pagar</b>, toque no nome para pagar outro valor, ajustar só aquele mês ou pular.</li>
      <li>Use as setas no topo para ver outros meses (inclusive os próximos, com a previsão).</li>
      <li>Quer falar com uma IA (Claude, ChatGPT)? Veja <a href="#ia">Conectar IA</a>.</li>
      <li>O backup é automático todo dia; veja em <a href="#backup">Backup</a> (administrador).</li>
    </ul>
  </section>`;
}

// Registro de telas: { id: [rótulo, ícone, grupo, função] }
const PAGES = {
  visao: ['Visão geral', 'grid', 'Finanças', viewVisao],
  fluxo: ['Fluxo de caixa', 'swap', 'Finanças', viewFluxo],
  receitas: ['Receitas e contratos', 'cash', 'Finanças', viewReceitas],
  cartoes: ['Cartões', 'card', 'Finanças', viewCartoes],
  casa: ['Nossa casa', 'home', 'Finanças', viewCasa],
  reserva: ['Poupança', 'piggy', 'Finanças', viewReserva],
  bancarias: ['Contas bancárias', 'bankacc', 'Finanças', viewContasBanco],
  emprestimos: ['Empréstimos', 'loan', 'Finanças', viewEmprestimos],
  assinaturas: ['Assinaturas', 'subs', 'Finanças', viewAssinaturas],
  lembretes: ['Pagamentos recorrentes', 'clock', 'Finanças', viewLembretes],
  bens: ['Bens e patrimônio', 'key', 'Finanças', viewBens],
  projetos: ['Projetos e obras', 'tool', 'Finanças', viewProjetos],
  despensa: ['Despensa', 'cart', 'Casa', viewDespensa],
  contas: ['Contas fixas', 'list', 'Cadastros', viewContas],
  bancos: ['Bancos', 'palette', 'Cadastros', viewBancos],
  renda: ['Nossa renda', 'wallet', 'Configurações', viewRenda, 'settings'],
  acessos: ['Acessos', 'users', 'Configurações', viewAcessos, 'manage_users'],
  notificacoes: ['Notificações', 'bell', 'Configurações', viewNotificacoes],
  backup: ['Backup', 'shield', 'Configurações', viewBackup, 'server'],
  ia: ['Conectar IA', 'spark', 'Configurações', viewIA],
  ajuda: ['Como usar', 'help', 'Configurações', viewAjuda],
  suporte: ['Ajuda e suporte', 'chat', 'Configurações', viewSuporte],
  perfil: ['Meu perfil', 'user', 'Conta', viewPerfil, 'hidden'],
};

const ADD_MENU = [
  ['transaction', 'img:diaadia', 'Gasto ou entrada'],
  ['receive', 'img:renda', 'Recebi (contrato, salário…)'],
  ['transfer', 'img:banco', 'Transferência entre contas'],
  ['income', 'img:renda', 'Receita / contrato'],
  ['pantry', 'img:diaadia', 'Produto da despensa'],
  ['bill', 'img:pagar', 'Conta mensal'],
  ['purchase', 'img:cartoes', 'Compra no cartão'],
  ['reserve', 'img:poupanca', 'Guardar ou retirar'],
  ['saving', 'img:alvo', 'Nova caixinha (meta)'],
  ['loan', 'img:emprestimos', 'Empréstimo'],
  ['subscription', 'img:cartoes', 'Assinatura (Netflix, Claude…)'],
  ['reminder', 'img:relogio', 'Pagamento recorrente (lembrete)'],
  ['loanpay', 'img:relogio', 'Antecipar parcelas'],
  ['move', 'img:banco', 'Ajustar saldo da conta'],
  ['project', 'img:projetos', 'Projeto / obra'],
  ['asset', 'img:carro', 'Bem (carro, casa, lote)'],
];

// ---------- render ----------
function renderShell() {
  let lastGroup = '';
  $('#nav').innerHTML = Object.entries(PAGES).filter(([, pg]) => !pg[4] || (pg[4] !== 'hidden' && can(pg[4]))).map(([id, [label, ic, group]]) => {
    const g = group !== lastGroup ? `<div class="group">${group}</div>` : '';
    lastGroup = group;
    return `${g}<a href="#${id}" class="${state.page === id ? 'active' : ''}">${icon(ic)}${label}</a>`;
  }).join('');
  const tabs = [['visao', 'grid', 'Início'], ['fluxo', 'swap', 'Fluxo'], null, ['reserva', 'piggy', 'Poupança']];
  $('#tabBar').innerHTML = tabs.map((t) => (t
    ? `<a href="#${t[0]}" class="${state.page === t[0] ? 'on' : ''}">${icon(t[1])}<span>${t[2]}</span></a>`
    : (can('launch') ? '<button class="tab-add" id="tabAdd" aria-label="Adicionar">+</button>' : '<span></span>'))).join('')
    + `<button class="tab" id="tabMenu">${icon('list')}<span>Menu</span></button>`;
  const hr = new Date().getHours();
  const first = String(state.user?.name || '').split(' ')[0];
  const g = $('#greeting'); if (g) g.textContent = first ? `${hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite'}, ${first}${state.viewWho ? ` · vendo ${state.viewWho === 'casal' ? 'o casal' : (state.data?.me?.name || '').split(' ')[0]}` : ''}` : '';
  const [y, m] = state.month.split('-');
  $('#monthTitle').innerHTML = `${MESES[Number(m) - 1]} <span class="yr">${y}</span> <span class="muted chev">${I.chevD}</span>`;
  $('#monthPicker').value = state.month;
  const d = state.data;
  if (d) {
    $('#brandAvatars').innerHTML = d.people.slice(0, 2).map((x) => avatar(x)).join('');
    const u = state.user || {};
    $('#profile').innerHTML = `<a href="#perfil" class="profile-link">${avatar({ ...d.me, name: u.name || d.me.name, photo: u.photo })}<div style="min-width:0"><b>${esc(u.name || d.me.name)}</b><small>${esc(u.role_label || '')}${d.people.length > 1 ? ` · com ${esc(d.other.name)}` : ''}</small></div></a><button class="icon-btn ghost" id="logoutBtn" title="Sair" aria-label="Sair">${I.power}</button>`;
  }
  const theme = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === theme));
}

// Qual painel estou vendo: o meu (padrão), o de outra pessoa da casa ou o do casal somado.
const sumPath = () => `summary?month=${state.month}${state.viewWho ? `&person=${state.viewWho}` : ''}`;
let renderSeq = 0;
async function draw(fromCache, seq, background = false) {
  apiFromCache = fromCache;
  let data, banks, html;
  try {
    [data, banks] = await Promise.all([api(sumPath()), api('banks')]);
    const page = PAGES[state.page] || PAGES.visao;
    html = await page[3](data);
  } finally { apiFromCache = false; }
  if (seq !== renderSeq) return; // já clicou em outra aba
  const same = state.renderedPage === state.page && state.renderedMonth === state.month;
  if (!fromCache && same && html === state.lastHtml) { state.data = data; return; } // nada mudou: não redesenha
  // Não atrapalha quem está digitando num campo da tela.
  if (background && same && $('#view').contains(document.activeElement) && document.activeElement.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea')) return;
  state.data = data;
  setBanks(banks);
  renderShell();
  $('#view').innerHTML = html;
  state.lastHtml = html;
  if (!same) window.scrollTo(0, 0);
  state.renderedPage = state.page;
  state.renderedMonth = state.month;
  afterRender();
}
async function refresh(opts = {}) {
  const seq = ++renderSeq;
  try {
    const fast = opts.fast && GETC.has(sumPath());
    if (fast) await draw(true, seq);
    loading(true);
    await draw(false, seq, fast);
  } catch (e) {
    if (e.message !== 'login') $('#view').innerHTML = `<section class="panel error">Erro: ${esc(e.message)}</section>`;
  } finally { if (seq === renderSeq) loading(false); }
  warmUp();
}
// Depois que a tela abre, carrega em segundo plano os dados das outras abas (abrem na hora ao clicar).
let warmTimer = null;
function warmUp() {
  clearTimeout(warmTimer);
  if (GETC.has('__warm') || !state.data) return;
  warmTimer = setTimeout(async () => {
    GETC.set('__warm', 1);
    for (const [id, pg] of Object.entries(PAGES)) {
      if (id === state.page || (pg[4] && (pg[4] === 'hidden' || !can(pg[4])))) continue;
      if (!GETC.has('__warm')) return; // houve gravação no meio: recomeça na próxima
      try { await pg[3](state.data); } catch { /* ignora */ }
    }
  }, 700);
}

function afterRender() {
  const sf = $('#settingsForm');
  if (sf) {
    sf.onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(sf));
      ['daily_budget', 'housing_ref', 'reserve_goal'].forEach((k) => { body[k] = Number(body[k]) || 0; });
      await api('settings', { method: 'PUT', body });
      toast('Ajustes salvos'); refresh();
    };
  }
  const imp = $('#importFile');
  if (imp) {
    imp.onchange = async () => {
      const f = imp.files[0];
      if (!f || !(await askConfirm('Restaurar backup', 'Os dados atuais serão substituídos pelos do arquivo.', 'Restaurar'))) { imp.value = ''; return; }
      try { await api('import', { method: 'POST', body: JSON.parse(await f.text()) }); toast('Backup restaurado'); refresh(); } catch (err) { toast(`Erro: ${err.message}`); }
    };
  }
  const car = $('#carousel');
  if (car) {
    const sel = car.children[Math.min(state.cardIdx, car.children.length - 1)];
    if (sel) car.scrollLeft = sel.offsetLeft - car.offsetLeft - 18;
  }
}

// Cliques delegados (funcionam para qualquer tela)
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-pay],[data-due],[data-form],[data-goto],[data-card-step],[data-card-idx],[data-hmode],[data-theme-set],[data-edit-bill],[data-edit-tx],[data-edit-card],[data-edit-purchase],[data-edit-person],[data-edit-reserve],[data-edit-project],[data-edit-bank],[data-edit-saving],[data-edit-loan],[data-edit-loanpay],[data-sv-filter],[data-edit-user],#tourBtn,#helpTopBtn,[data-restore],[data-del-backup],#backupNowBtn,[data-asset-open],[data-asset-value],[data-fipe],[data-edit-asset],[data-payitem],[data-edit-reminder],[data-edit-subscription],[data-edit-income],[data-close-income],[data-receive],[data-undo-receipt],[data-inc-filter],[data-view-who],[data-pantry-use],[data-pantry-buy],[data-pantry-open],[data-edit-pantry],#pantryCopy,[data-ticket],#ticketNew,[data-faq-vote],[data-ticket-from],[data-notif],[data-notif-pay],#bellBtn,#readAllBtn,#pushBtn,#pushTestBtn,#checkNowBtn,[data-del-device],[data-ia-tab],[data-revoke],#copyToken,[data-edit-account],[data-edit-move],#newUserBtn,#logoutBtn,#tabMenu,#tabAdd,#distBtn,#settleBtn,#resetBtn');
  if (!t) {
    if (!e.target.closest('.dropdown, #addMenu')) $('#addMenu').classList.remove('open');
    if (!e.target.closest('.bell-wrap')) $('#notifPanel').classList.remove('open');
    return;
  }
  const ds = t.dataset;
  if (ds.pay) { const [type, id, paid, date] = ds.pay.split(':'); return togglePay(type, Number(id), paid === '1', date); }
  if (ds.payitem) { const [type, id, date] = ds.payitem.split(':'); return openPayItem(state.data.to_pay.items.find((x) => x.type === type && x.id === Number(id) && (x.date || '') === (date || ''))); }
  if (ds.due) { state.dueFilter = state.dueFilter === Number(ds.due) ? null : Number(ds.due); return refresh(); }
  if (ds.form === 'receive' || ds.form === 'income') state.incomes = await api('incomes');
  if (ds.form) { $('#addMenu').classList.remove('open'); return openForm(ds.form, ds.kind ? { kind: ds.kind } : ds.account ? { account_id: Number(ds.account) } : ds.asset ? { asset_id: Number(ds.asset), category: state.data.assets.list.find((x) => x.id === Number(ds.asset))?.kind === 'veiculo' ? 'Manutenção' : 'Obra' } : null); }
  if (ds.goto) { location.hash = ds.goto; return; }
  if (ds.cardStep) { const n = state.data.cards.length; state.cardIdx = (state.cardIdx + Number(ds.cardStep) + n) % n; return refresh(); }
  if (ds.cardIdx) { state.cardIdx = Number(ds.cardIdx); return refresh(); }
  if (ds.hmode) { state.housingMode = ds.hmode; return refresh(); }
  if (ds.themeSet) { document.documentElement.dataset.theme = ds.themeSet; store.set('theme', ds.themeSet); return renderShell(); }
  const edit = (form, res, id) => api(`${res}/${id}`).then((r) => openForm(form, r));
  if (ds.editBill) return edit('bill', 'bills', ds.editBill);
  if (ds.editTx) return edit('transaction', 'transactions', ds.editTx);
  if (ds.editCard) return edit('card', 'cards', ds.editCard);
  if (ds.editPurchase) return edit('purchase', 'purchases', ds.editPurchase);
  if (ds.editPerson) return edit('person', 'people', ds.editPerson);
  if (ds.editReserve) return edit('reserve', 'reserve', ds.editReserve);
  if (ds.editProject) return edit('project', 'projects', ds.editProject);
  if (ds.editBank) return edit('bank', 'banks', ds.editBank);
  if (ds.editAccount) return edit('account', 'accounts', ds.editAccount);
  if (ds.editMove) return edit('move', 'moves', ds.editMove);
  if (ds.editSaving) return edit('saving', 'savings', ds.editSaving);
  if (ds.editLoan) return edit('loan', 'loans', ds.editLoan);
  if (ds.editLoanpay) return edit('loanpay', 'loanpay', ds.editLoanpay);
  if (ds.svFilter !== undefined) { state.savingFilter = Number(ds.svFilter); return refresh(); }
  if (ds.iaTab) { state.iaTab = ds.iaTab; return refresh(); }
  if (ds.revoke) {
    if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Confirmar'; return; }
    await api(`tokens/${ds.revoke}`, { method: 'DELETE' }); toast('Chave revogada'); return refresh();
  }
  if (t.id === 'copyToken') {
    const inp = $('#tokenUrl');
    try { await navigator.clipboard.writeText(inp.value); toast('Endereço copiado'); } catch { inp.select(); toast('Selecionado: copie com Ctrl+C'); }
    return;
  }
  if (ds.assetOpen) { state.assetOpen = state.assetOpen === Number(ds.assetOpen) ? null : Number(ds.assetOpen); return refresh(); }
  if (ds.assetValue) return openAssetValue(state.data.assets.list.find((x) => x.id === Number(ds.assetValue)));
  if (ds.fipe) return openFipe(state.data.assets.list.find((x) => x.id === Number(ds.fipe)));
  if (ds.editAsset) return edit('asset', 'assets', ds.editAsset);
  if (t.id === 'backupNowBtn') { t.disabled = true; try { const r = await api('backups/run', { method: 'POST', body: {} }); toast(`Backup feito${r.extra && !String(r.extra).startsWith('erro') ? ' (com cópia extra)' : ''}`); } catch (err) { toast(err.message); } return refresh(); }
  if (ds.restore) {
    if (!(await askConfirm('Restaurar backup', 'Os dados atuais serão trocados pelos deste backup. Antes disso, o app guarda um backup do estado atual.', 'Restaurar', 'RESTAURAR'))) return;
    await api('backups/restore', { method: 'POST', body: { name: ds.restore } }); toast('Backup restaurado'); return refresh();
  }
  if (ds.delBackup) { if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Confirmar'; return; } await api(`backups/${encodeURIComponent(ds.delBackup)}`, { method: 'DELETE' }); return refresh(); }
  if (ds.editReminder) return edit('reminder', 'reminders', ds.editReminder);
  if (ds.editSubscription) return edit('subscription', 'subscriptions', ds.editSubscription);
  if (ds.editIncome) return edit('income', 'incomes', ds.editIncome);
  if (ds.ticket) return openTicket(Number(ds.ticket));
  if (t.id === 'ticketNew') return openTicketForm();
  if (ds.ticketFrom != null) return openTicketForm(ds.ticketFrom);
  if (ds.faqVote) { const [fid, yes] = ds.faqVote.split(':'); await api('ajuda/feedback', { method: 'POST', body: { id: fid, helpful: yes === '1' } }); const box = t.closest('.faq-actions'); if (box) box.innerHTML = yes === '1' ? '<span class="small good">Que bom! ✓</span>' : `<span class="small">Sinto muito. <button type="button" class="link-btn" data-ticket-from="">Falar com o suporte</button></span>`; return; }
  if (ds.pantryUse) { const r = await api('despensa/use', { method: 'POST', body: { item_id: Number(ds.pantryUse), qty: 1 } }); toast(`${r.item.name}: sobrou ${String(r.item.qty).replace('.', ',')} ${r.item.unit}${r.status.low ? ' · entrou na lista' : ''}`); return refresh(); }
  if (ds.pantryBuy) return openForm('pantryBuy', { item_id: Number(ds.pantryBuy), qty: Number(ds.qty) || 1, date: today() });
  if (ds.pantryOpen) return openPantryItem(Number(ds.pantryOpen));
  if (ds.editPantry) return edit('pantry', 'pantry', ds.editPantry);
  if (t.id === 'pantryCopy') { try { await navigator.clipboard.writeText(`Lista de compras\n${t.dataset.text}`); toast('Lista copiada'); } catch { toast('Não deu para copiar neste navegador'); } return; }
  if (ds.viewWho) { const v = ds.viewWho === 'casal' ? 'casal' : Number(ds.viewWho); state.viewWho = v === state.user?.person_id ? null : v; return refresh({ fast: true }); }
  if (ds.incFilter) { state.incFilter = ds.incFilter === 'all' ? 'all' : Number(ds.incFilter); return refresh(); }
  if (ds.closeIncome) {
    if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Confirmar encerramento'; return; }
    await api(`incomes/${ds.closeIncome}`, { method: 'PUT', body: { active: false, end_month: state.month } }); toast('Receita encerrada (o histórico fica)'); return refresh();
  }
  if (ds.undoReceipt) {
    if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Confirmar'; return; }
    await api('receive/undo', { method: 'POST', body: { id: Number(ds.undoReceipt) } }); toast('Recebimento desfeito'); return refresh();
  }
  if (ds.receive) {
    if (!state.incomes) state.incomes = await api('incomes');
    const o = await api(`incomes-overview?month=${state.month}`);
    const it = o.list.find((x) => x.id === Number(ds.receive));
    return openForm('receive', { income_id: Number(ds.receive), amount: it ? (it.month.parts > 1 && it.month.remaining > it.month.part_value ? it.month.part_value : it.month.remaining || it.amount) : '', account_id: it?.account_id, ref_month: state.month, date: today() });
  }
  if (t.id === 'bellBtn') { e.stopPropagation(); const pn = $('#notifPanel'); pn.classList.toggle('open'); if (pn.classList.contains('open')) { renderNotifPanel(); loadBell(); } return; }
  if (t.id === 'readAllBtn') { await api('notifications/read', { method: 'POST', body: {} }); return loadBell(); }
  if (ds.notifPay) {
    const n = (state.notifs || []).find((x) => x.id === Number(ds.notifPay));
    if (n?.action) await api('pay', { method: 'POST', body: { ...n.action, paid: true } });
    await api('notifications/read', { method: 'POST', body: { id: n.id } }); toast('Pago'); loadBell(); return refresh();
  }
  if (ds.notif) {
    await api('notifications/read', { method: 'POST', body: { id: Number(ds.notif) } });
    $('#notifPanel').classList.remove('open'); const u = t.dataset.url || ''; if (u.includes('#')) location.hash = u.split('#')[1];
    return loadBell();
  }
  if (t.id === 'pushBtn') { try { await enablePush(); toast('Notificações ativadas neste aparelho'); refresh(); } catch (err) { toast(err.message); } return; }
  if (t.id === 'pushTestBtn') { const r = await api('push/test', { method: 'POST', body: {} }); toast(r.total ? `Teste enviado para ${r.sent} de ${r.total} aparelho(s)` : 'Nenhum aparelho ativado ainda'); return; }
  if (t.id === 'checkNowBtn') { const r = await api('notifications/check', { method: 'POST', body: { force: true } }); toast(r.created ? `${r.created} aviso(s) novo(s)` : 'Nada novo para avisar agora'); return loadBell(); }
  if (ds.delDevice) { await api(`push/${ds.delDevice}`, { method: 'DELETE' }); return refresh(); }
  if (t.id === 'tourBtn') return startTour(0);
  if (t.id === 'helpTopBtn') { location.hash = 'ajuda'; return; }
  if (t.id === 'tabMenu') return toggleSidebar(true);
  if (t.id === 'tabAdd') {
    const menu = $('#addMenu');
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    menu.classList.add('sheet'); menu.classList.toggle('open'); return;
  }
  if (t.id === 'logoutBtn') { await api('logout', { method: 'POST' }); return showLogin(); }
  if (ds.editUser) return openUserForm(state.users.find((u) => u.id === Number(ds.editUser)));
  if (t.id === 'newUserBtn') return openUserForm(null);
  if (t.id === 'distBtn') return openDistribute(`Recebi o salário de ${monthName(state.month).toLowerCase()}: quanto guardar?`, state.data.balance.salary);
  if (t.id === 'settleBtn') { await api(`settle?month=${state.month}`, { method: 'POST', body: { done: !state.data.house.settled } }); return refresh(); }
  if (t.id === 'resetBtn') {
    if (await askConfirm('Apagar todos os dados', 'Apaga contas, cartões, lançamentos, reserva e projetos. As pessoas ficam, com salário zerado.', 'Apagar tudo', 'APAGAR')) {
      await api('reset', { method: 'POST', body: { confirm: 'APAGAR' } }); toast('Dados apagados'); refresh();
    }
  }
});

function setMonth(m) { state.month = m; state.dueFilter = null; store.set('month', m); refresh({ fast: true }); }
$('#prevMonth').onclick = () => setMonth(addMonths(state.month, -1));
$('#nextMonth').onclick = () => setMonth(addMonths(state.month, 1));
$('#monthTitle').onclick = () => { const p = $('#monthPicker'); if (p.showPicker) p.showPicker(); else p.click(); };
$('#monthTitle').style.cursor = 'pointer';
$('#monthPicker').onchange = (e) => e.target.value && setMonth(e.target.value);
$('#addMenu').innerHTML = ADD_MENU.map(([f, ic, l]) => `<button data-form="${f}">${ic.startsWith('img:') ? illus(ic.slice(4), 'menu-ic') : `<span class="menu-ic">${ic}</span>`}${l}</button>`).join('');
$('#addBtn').onclick = (e) => {
  e.stopPropagation();
  const menu = $('#addMenu');
  if (menu.classList.contains('sheet')) { menu.classList.remove('sheet', 'open'); $('#addBtn').after(menu); }
  menu.classList.toggle('open');
};
const toggleSidebar = (open) => { $('#sidebar').classList.toggle('open', open); $('#scrim').classList.toggle('open', open); };
$('#menuBtn').onclick = () => toggleSidebar(true);
$('#scrim').onclick = () => toggleSidebar(false);

function route() {
  const prev = state.page;
  state.page = (location.hash || '#visao').slice(1);
  if (prev !== state.page) state.newToken = null;
  const pg = PAGES[state.page];
  if (!pg || (pg[4] && pg[4] !== 'hidden' && !can(pg[4]))) state.page = 'visao';
  toggleSidebar(false);
  refresh({ fast: true });
}
window.addEventListener('hashchange', route);

// ---------- entrar / primeira instalação ----------
// Logo da casinha com os dois "olhinhos" que piscam (e fecham enquanto você digita a senha).
const LOGO = `<svg class="logo-anim" viewBox="0 0 64 64" role="img" aria-label="Casa em Dia">
  <rect width="64" height="64" rx="14" fill="#2563eb"/><path d="M14 31l18-15 18 15v17H14z" fill="#fff"/>
  <g class="eye"><circle cx="26" cy="37" r="5" fill="#2563eb"/><circle cx="27.6" cy="35.4" r="1.4" fill="#fff"/></g>
  <g class="eye"><circle cx="38" cy="37" r="5" fill="#f43f5e"/><circle cx="39.6" cy="35.4" r="1.4" fill="#fff"/></g></svg>`;

function authScreen(html) {
  $('#app').hidden = true;
  let el = $('#authScreen');
  if (!el) { el = document.createElement('div'); el.id = 'authScreen'; document.body.prepend(el); }
  el.hidden = false;
  el.innerHTML = `<div class="login">${html}</div>`;
  // Olhinhos fecham enquanto digita a senha ("não estou olhando").
  el.querySelectorAll('input[type=password]').forEach((i) => {
    i.addEventListener('focus', () => el.classList.add('peek-off'));
    i.addEventListener('blur', () => el.classList.remove('peek-off'));
  });
  return el;
}

async function showLogin(msg = '') {
  let info = { signup: false };
  try { info = await (await fetch('/api/login-info', { credentials: 'same-origin' })).json(); } catch (e) {}
  if (info.setup) return showSetup();
  authScreen(`<form class="panel auth-card" id="loginForm">
    <div class="auth-brand">${LOGO}<div><b>Casa em Dia</b><small>Finanças em casal</small></div></div>
    <h2>Entrar</h2>
    ${msg ? `<div class="notice">${esc(msg)}</div>` : ''}
    ${info.default_admin ? '<div class="notice info">Primeiro acesso: login <b>admin</b> e senha <b>123456</b>. Você vai trocar a senha logo em seguida.</div>' : ''}
    <div class="field"><label for="l_login">Login</label><input id="l_login" name="login" autocomplete="username" autocapitalize="none" required></div>
    <div class="field"><label for="l_pass">Senha</label><input id="l_pass" type="password" name="password" autocomplete="current-password" required></div>
    <div class="error" id="loginErr"></div>
    <button class="btn primary">Entrar</button>
    ${info.signup ? '<p class="small" style="margin:0;text-align:center">Não tem acesso? <button type="button" class="link-btn" id="toSignup">Criar conta</button></p>' : ''}
    <div class="field" id="l_code_f" hidden><label for="l_code">Código de 2 etapas</label><input id="l_code" name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="6 números do app autenticador"><span class="hint">Perdeu o celular? Use um código de recuperação (ex.: a1b2c-3d4e5).</span></div>
    <p class="muted small" style="margin:0">Esqueceu a senha? Peça ao administrador para definir uma nova em Acessos. · <a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>
  </form>`);
  $('#l_login').focus();
  const ts = $('#toSignup'); if (ts) ts.onclick = showSignup;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const r = await api('login', { method: 'POST', body: { login: f.login.value, password: f.password.value, code: f.code.value || undefined } });
      if (r.need_totp) { $('#l_code_f').hidden = false; $('#loginErr').textContent = ''; f.code.focus(); return; }
      start();
    } catch (err) { $('#loginErr').textContent = err.message; }
  };
}

function showSignup() {
  authScreen(`<form class="panel auth-card" id="signupForm">
    <div class="auth-brand">${LOGO}<div><b>Casa em Dia</b><small>Pedir acesso</small></div></div>
    <h2>Criar conta</h2>
    <p class="muted small" style="margin:0">Você ganha uma conta só sua: seus dados ficam separados e ninguém mais vê. O administrador do servidor só precisa aprovar o cadastro.</p>
    <div class="field"><label for="r_name">Seu nome</label><input id="r_name" autocomplete="name" required></div>
    <div class="field"><label for="r_login">Login</label><input id="r_login" autocomplete="username" autocapitalize="none" required></div>
    <div class="form-row">
      <div class="field"><label for="r_pass">Senha</label><input id="r_pass" type="password" minlength="6" autocomplete="new-password" required></div>
      <div class="field"><label for="r_pass2">Repita a senha</label><input id="r_pass2" type="password" minlength="6" autocomplete="new-password" required></div>
    </div>
    <label class="of-check small"><input type="checkbox" id="r_terms" required> <span>Li e aceito a <a href="privacidade.html" target="_blank" rel="noopener">política de privacidade e os termos de uso</a></span></label>
    <div class="error" id="signupErr"></div>
    <button class="btn primary">Pedir acesso</button>
    <p class="small" style="margin:0;text-align:center"><button type="button" class="link-btn" id="toLogin">Já tenho acesso: entrar</button></p>
  </form>`);
  $('#r_name').focus();
  $('#toLogin').onclick = () => showLogin();
  $('#signupForm').onsubmit = async (e) => {
    e.preventDefault();
    if ($('#r_pass').value !== $('#r_pass2').value) { $('#signupErr').textContent = 'As senhas não conferem'; return; }
    try {
      await api('signup', { method: 'POST', body: { name: $('#r_name').value, login: $('#r_login').value, password: $('#r_pass').value, accept_terms: $('#r_terms').checked } });
      showLogin('Cadastro enviado. Assim que o administrador aprovar, entre com seu login e senha.');
    } catch (err) { $('#signupErr').textContent = err.message; }
  };
}

function photoPicker(id, current) {
  return `<div class="photo-pick"><span class="avatar xl" id="${id}_prev" style="background:#94a3b8">${current ? `<img src="${current}" alt="">` : I.camera}</span>
    <div style="display:grid;gap:6px"><label class="btn sm">Escolher foto<input type="file" accept="image/*" id="${id}_file" hidden></label>
    <button type="button" class="btn sm" id="${id}_clear" ${current ? '' : 'hidden'}>Remover foto</button></div><input type="hidden" id="${id}" value="${esc(current || '')}"></div>`;
}
function bindPhoto(id) {
  const hidden = $(`#${id}`); const prev = $(`#${id}_prev`); const clr = $(`#${id}_clear`);
  $(`#${id}_file`).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { hidden.value = await imageToDataUrl(f, 256); prev.innerHTML = `<img src="${hidden.value}" alt="">`; clr.hidden = false; } catch (err) { toast(err.message); }
  };
  clr.onclick = () => { hidden.value = ''; prev.innerHTML = I.camera; clr.hidden = true; };
}

function showSetup() {
  authScreen(`<form class="panel auth-card" id="setupForm">
    <div class="auth-brand">${LOGO}<div><b>Casa em Dia</b><small>Primeiro acesso</small></div></div>
    <h2>Crie seu login</h2>
    <p class="muted small" style="margin:0">Este é o primeiro acesso do sistema: quem cria este login vira o <b>administrador</b>, que controla os dados e os acessos das outras pessoas.</p>
    <div class="field"><label for="s_login">Login</label><input id="s_login" required autocomplete="username" autocapitalize="none" placeholder="ex.: diego"></div>
    <div class="field"><label for="s_pass">Senha</label><input id="s_pass" type="password" minlength="6" required autocomplete="new-password"></div>
    <div class="field"><label for="s_pass2">Repita a senha</label><input id="s_pass2" type="password" minlength="6" required autocomplete="new-password"></div>
    <div class="error" id="setupErr"></div>
    <button class="btn primary">Criar e entrar</button>
  </form>`);
  $('#s_login').focus();
  $('#setupForm').onsubmit = async (e) => {
    e.preventDefault();
    if ($('#s_pass').value !== $('#s_pass2').value) { $('#setupErr').textContent = 'As senhas não conferem'; return; }
    try { await api('setup', { method: 'POST', body: { login: $('#s_login').value, password: $('#s_pass').value } }); start(); } catch (err) { $('#setupErr').textContent = err.message; }
  };
}

// Primeiro acesso de cada pessoa: completar o perfil.
function showOnboarding(me) {
  const u = me.user;
  const first = me.first_admin;
  authScreen(`<form class="panel auth-card wide" id="onbForm">
    <div class="auth-brand">${LOGO}<div><b>Bem-vindo${u.name && u.name !== u.login ? `, ${esc(u.name)}` : ''}!</b><small>Vamos completar seu perfil</small></div></div>
    <h2>Suas informações</h2>
    ${photoPicker('o_photo', u.photo)}
    <div class="field"><label for="o_name">Seu nome</label><input id="o_name" value="${esc(u.name && u.name !== u.login ? u.name : '')}" autocomplete="name" required></div>
    <div class="form-row">
      <div class="field"><label for="o_email">E-mail (opcional)</label><input id="o_email" type="email" value="${esc(u.email || '')}" autocomplete="email"></div>
      <div class="field"><label for="o_phone">Telefone (opcional)</label><input id="o_phone" value="${esc(u.phone || '')}" autocomplete="tel"></div>
    </div>
    ${u.must_change ? `<div class="form-row">
      <div class="field"><label for="o_login">Seu login</label><input id="o_login" value="${esc(u.login)}" autocapitalize="none" autocomplete="username" required><span class="hint">Pode manter "admin" ou trocar pelo seu</span></div>
      <div class="field"><label for="o_pass">Nova senha</label><input id="o_pass" type="password" minlength="6" autocomplete="new-password" required><span class="hint">Obrigatório: troque a senha padrão</span></div>
    </div>` : ''}
    <div class="field"><label for="o_salary">Seu salário líquido por mês (R$)</label><input id="o_salary" type="number" step="0.01" inputmode="decimal" placeholder="Opcional: dá para preencher depois"><span class="hint">Usado para calcular o saldo previsto e a divisão das contas da casa.</span></div>
    ${first ? `<div class="field"><label>Como quer começar?</label><div class="role-pick">
      <label class="role-opt"><input type="radio" name="o_demo" value="0" checked><span><b>Do zero</b><small>Sistema vazio para cadastrar suas contas, cartões e metas.</small></span></label>
      <label class="role-opt"><input type="radio" name="o_demo" value="1"><span><b>Com dados de exemplo</b><small>Para conhecer as telas. Dá para apagar depois em Nossa renda.</small></span></label>
    </div></div>` : ''}
    <div class="error" id="onbErr"></div>
    <button class="btn primary">Começar a usar</button>
  </form>`);
  bindPhoto('o_photo');
  $('#o_name').focus();
  $('#onbForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = { name: $('#o_name').value, email: $('#o_email').value, phone: $('#o_phone').value, photo: $('#o_photo').value, salary: $('#o_salary').value };
    if (first) body.demo = document.querySelector('input[name=o_demo]:checked').value === '1';
    if (u.must_change) { body.new_login = $('#o_login').value; body.new_password = $('#o_pass').value; }
    try { await api('onboarding', { method: 'POST', body }); start(); } catch (err) { $('#onbErr').textContent = err.message; }
  };
}

// ---------- perfil e acessos ----------
const ACTION_TXT = { login: 'Entrou', login_falhou: 'Tentativa de entrada recusada', logout: 'Saiu', senha_trocada: 'Senha trocada', '2fa_ligado': 'Ligou o login em 2 etapas', '2fa_desligado': 'Desligou o login em 2 etapas', '2fa_removido_pelo_admin': '2 etapas removido pelo administrador', codigo_recuperacao_usado: 'Usou um código de recuperação', sessoes_encerradas: 'Saiu dos outros aparelhos', meus_dados_baixados: 'Baixou os próprios dados', dados_exportados: 'Exportou os dados', dados_importados: 'Importou dados', dados_apagados: 'Apagou todos os dados', backup_restaurado: 'Restaurou um backup', app_atualizado: 'Atualizou o app', app_versao_anterior: 'Voltou a versão do app', chave_pluggy_alterada: 'Alterou a chave da Pluggy', acesso_criado: 'Criou um acesso', acesso_alterado: 'Alterou um acesso', acesso_excluido: 'Excluiu um acesso', cadastro_pedido: 'Pediu cadastro', conta_excluida_pelo_usuario: 'Excluiu a própria conta' };
const actTxt = (a) => ACTION_TXT[a] || a;
const whenTxt = (at) => new Date(String(at).replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

async function viewPerfil(d) {
  const u = state.user;
  const sec = await api('me/security').catch(() => null);
  return `<section class="panel" style="max-width:640px">
    <h2>Meu perfil</h2>
    <form id="profileForm" style="display:grid;gap:12px">
      ${photoPicker('p_photo', u.photo)}
      <div class="form-row">
        <div class="field"><label for="p_name">Nome</label><input id="p_name" name="name" value="${esc(u.name)}" required></div>
        <div class="field"><label>Login</label><input value="${esc(u.login)}" disabled></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="p_email">E-mail</label><input id="p_email" name="email" type="email" value="${esc(u.email || '')}"></div>
        <div class="field"><label for="p_phone">Telefone</label><input id="p_phone" name="phone" value="${esc(u.phone || '')}"></div>
      </div>
      <div class="muted small">Nível de acesso: <b>${esc(u.role_label)}</b> · ${esc(state.roles?.[u.role]?.desc || '')}</div>
      <details><summary class="small" style="cursor:pointer;font-weight:600">Trocar senha</summary>
        <div class="form-row" style="margin-top:10px">
          <div class="field"><label for="p_cur">Senha atual</label><input id="p_cur" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="p_new">Nova senha</label><input id="p_new" type="password" minlength="6" autocomplete="new-password"></div>
        </div></details>
      <div class="error" id="profileErr"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary">Salvar perfil</button><a class="btn" href="#ia">${I.spark} Conectar IA</a><button type="button" class="btn" id="logoutBtn">Sair da conta</button></div>
    </form>
  </section>
  ${sec ? `<section class="panel" style="max-width:640px">
    <h2>Segurança</h2>
    <div class="row" style="padding:10px 0"><div style="min-width:0"><b>Login em 2 etapas</b> ${sec.totp_enabled ? '<span class="pill green">ligado</span>' : '<span class="pill gray">desligado</span>'}
      <div class="muted small">${sec.totp_enabled ? `Além da senha, pede o código do app autenticador. Códigos de recuperação restantes: ${sec.recovery_left}.` : 'Recomendado: além da senha, pede um código que muda a cada 30 s no seu celular (Google Authenticator, Authy, 1Password…).'}</div></div>
      ${sec.totp_enabled ? '<button class="btn sm" id="totpOff">Desligar</button>' : '<button class="btn sm primary" id="totpOn">Ativar</button>'}</div>
    <div id="totpBox"></div>
    <div class="row" style="padding:10px 0"><div><b>Aparelhos conectados</b><div class="muted small">${sec.sessions} sessão(ões) ativa(s) com seu login.</div></div>${sec.sessions > 1 ? '<button class="btn sm" id="revokeSessions">Sair dos outros aparelhos</button>' : ''}</div>
    <details><summary class="small" style="cursor:pointer;font-weight:600">Atividade recente</summary>
      <div class="rows" style="margin-top:6px">${sec.activity.map((a) => `<div class="row"><div style="min-width:0"><span class="small">${esc(actTxt(a.action))}${a.detail ? ` <span class="muted">· ${esc(a.detail)}</span>` : ''}</span></div><span class="muted small">${whenTxt(a.at)}${a.ip ? ` · ${esc(a.ip)}` : ''}</span></div>`).join('') || '<div class="muted small">Nada ainda.</div>'}</div></details>
  </section>
  <section class="panel" style="max-width:640px">
    <h2>Seus dados</h2>
    <p class="muted small" style="margin-top:0">Pela LGPD você pode ver, baixar e apagar seus dados. <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade e termos</a></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="/api/me/export" download>${I.download} Baixar meus dados</a><button class="btn danger" id="deleteMeBtn">Excluir minha conta</button></div>
    <div id="deleteMeBox"></div>
  </section>` : ''}`;
}

async function viewAcessos(d) {
  state.users = await api('users');
  const roles = state.roles || {};
  const pend = state.users.filter((u) => u.pending);
  return `${pend.length ? `<section class="panel pending-box">
    <h2>Pedidos de acesso <span class="pill amber">${pend.length}</span></h2>
    <div class="rows">${pend.map((u) => `<div class="row"><div class="name">${avatar({ name: u.name, color: '#f59e0b' }, 'lg')}<div><b>${esc(u.name)}</b><div class="muted small">@${esc(u.login)} · conta separada · pediu em ${esc(String(u.created_at || '').slice(0, 10).split('-').reverse().join('/'))}</div></div></div>
      <div style="display:flex;gap:6px"><button class="btn sm primary" data-edit-user="${u.id}">Aprovar…</button></div></div>`).join('')}</div>
  </section>` : ''}
  <section class="panel">
    <div class="page-head"><h2>Acessos da conta</h2><button class="btn sm primary" id="newUserBtn">+ Novo acesso</button></div>
    <label class="field check-field" style="margin-top:8px"><input type="checkbox" id="allowSignup" ${state.signup ? 'checked' : ''}><span>Mostrar “Criar conta” na tela de login (desligado por padrão; os pedidos esperam sua aprovação e cada um ganha uma conta separada)</span></label>
    <p class="muted small" style="margin-top:6px">Cada acesso entra com login e senha próprios. <b>Dados principais</b>: vê os mesmos dados que você (ligado a uma pessoa da casa). <b>Conta separada</b>: tem os próprios dados, começa vazia e ninguém mais vê, nem você.</p>
    <div class="rows">${state.users.filter((u) => !u.pending).map((u) => `
      <div class="row clickable" data-edit-user="${u.id}" style="${u.active ? '' : 'opacity:.55'}">
        <div class="name">${avatar({ name: u.name, photo: u.photo, color: '#64748b' }, 'lg')}<div style="min-width:0"><b>${esc(u.name)}</b> ${u.id === state.user.id ? '<span class="pill blue">você</span>' : ''} ${u.active ? '' : '<span class="pill gray">desativado</span>'}
          <div class="muted small">@${esc(u.login)} · ${u.space_id ? `<span class="pill gray">${esc(u.space_name)}</span>` : `pessoa: ${esc(u.person_name || '—')}`}${u.invited_by_name ? ` · criado por ${esc(u.invited_by_name)}` : ''}</div></div></div>
        <span class="pill ${u.role === 'admin' ? 'blue' : u.role === 'parceiro' ? 'green' : u.role === 'lancador' ? 'amber' : 'gray'}">${esc(u.role_label)}</span>
      </div>`).join('')}</div>
  </section>
  ${await (async () => { const log = await api('audit').catch(() => []); return log.length ? `<section class="panel"><details><summary><b>Registro de acessos</b> <span class="muted small">(últimos ${log.length})</span></summary>
    <div class="rows" style="margin-top:8px">${log.map((a) => `<div class="row"><div style="min-width:0"><span class="small"><b>${esc(a.login || '—')}</b> · ${esc(actTxt(a.action))}${a.detail ? ` <span class="muted">· ${esc(a.detail)}</span>` : ''}</span></div><span class="muted small">${whenTxt(a.at)}${a.ip ? ` · ${esc(a.ip)}` : ''}</span></div>`).join('')}</div>
    <p class="muted small">Guardado por 1 ano. Tentativas recusadas repetidas podem indicar alguém tentando entrar.</p></details></section>` : ''; })()}
  <section class="panel">
    <h2>O que cada nível pode fazer</h2>
    <div class="table-wrap"><table><thead><tr><th>Nível</th><th>Pode</th></tr></thead><tbody>
      ${Object.values(roles).map((r) => `<tr><td><b>${esc(r.label)}</b></td><td class="muted">${esc(r.desc)}</td></tr>`).join('')}
    </tbody></table></div>
  </section>`;
}

function openUserForm(u) {
  const editing = !!u;
  const roles = state.roles || {};
  const people = state.data?.people || [];
  const form = $('#modalForm'); const dlg = $('#modal');
  form.innerHTML = `<h3>${editing ? (u.pending ? `Aprovar pedido: ${esc(u.name)}` : `Editar acesso: ${esc(u.name)}`) : 'Novo acesso'}</h3>
    <div class="form-row">
      <div class="field"><label for="u_name">Nome</label><input id="u_name" value="${esc(u?.name || '')}" required></div>
      <div class="field"><label for="u_login">Login</label><input id="u_login" value="${esc(u?.login || '')}" required autocomplete="off"></div>
    </div>
    <div class="field"><label for="u_pass">${editing ? 'Nova senha (deixe vazio para manter)' : 'Senha inicial'}</label><input id="u_pass" type="text" minlength="6" ${editing ? '' : 'required'} autocomplete="off"><span class="hint">Passe a senha para a pessoa; ela pode trocar depois em Meu perfil.</span></div>
    <div class="field"><label>Nível de acesso</label><div class="role-pick">${Object.entries(roles).map(([k, r]) => `
      <label class="role-opt"><input type="radio" name="u_role" value="${k}" ${(u?.role || 'admin') === k ? 'checked' : ''}><span><b>${esc(r.label)}</b><small>${esc(r.desc)}</small></span></label>`).join('')}</div><span class="hint">Numa conta separada, “Administrador” manda só nos próprios dados: não vê acessos nem backup do servidor.</span></div>
    ${editing ? `<div class="field"><label>Dados</label><div class="muted small">${u.space_id ? `${esc(u.space_name)}: ${u.pending ? 'ao aprovar, ganha uma conta separada, vazia, que só ela vê' : 'conta separada'}` : 'Dados principais (os mesmos que você vê)'}</div></div>`
    : `<div class="field"><label for="u_space">Dados ${help('espaco')}</label><select id="u_space"><option value="own" selected>Conta separada: dados próprios, começa vazia</option>${(state.spaces || []).map((sp) => `<option value="${sp.id}">${esc(sp.name)}</option>`).join('')}</select><span class="hint">Conta separada: ninguém mais vê os dados dela. Escolha “Dados principais” para quem divide a casa com você.</span></div>`}
    <div class="field" id="u_person_f" ${editing ? (u.space_id ? 'hidden' : '') : 'hidden'}><label for="u_person">Pessoa da casa</label><select id="u_person"><option value="">Criar pessoa nova com este nome</option>${people.map((p) => `<option value="${p.id}" ${u?.person_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select><span class="hint">O painel desse acesso é calculado para esta pessoa.</span></div>
    <div class="form-row">
      <div class="field"><label for="u_email">E-mail</label><input id="u_email" type="email" value="${esc(u?.email || '')}"></div>
      <div class="field"><label for="u_phone">Telefone</label><input id="u_phone" value="${esc(u?.phone || '')}"></div>
    </div>
    ${editing && u.totp_enabled && u.id !== state.user.id ? `<div class="field"><label>Login em 2 etapas</label><div><button type="button" class="btn sm" id="u_reset2fa" data-id="${u.id}">Remover 2 etapas (perdeu o celular)</button></div></div>` : ''}
    ${editing ? `<div class="field check-field"><input type="checkbox" id="u_active" ${u.active || u.pending ? 'checked' : ''}><label for="u_active">${u.pending ? 'Aprovar este pedido de acesso' : 'Acesso ativo (desmarque para bloquear sem apagar)'}</label></div>` : ''}
    <div class="error" id="formErr"></div>
    <div class="form-actions">${editing && u.id !== state.user.id ? `<button type="button" class="btn danger" id="delBtn">${u.pending ? 'Recusar pedido' : 'Excluir acesso'}</button>` : ''}
      <div class="right"><button type="button" class="btn" id="cancelBtn">Cancelar</button><button class="btn primary">Salvar</button></div></div>`;
  $('#cancelBtn').onclick = () => dlg.close();
  const rs = $('#u_reset2fa'); if (rs) rs.onclick = async () => {
    if (!rs.dataset.armed) { rs.dataset.armed = '1'; rs.textContent = 'Confirmar: remover 2 etapas'; return; }
    await api(`users/${rs.dataset.id}/2fa-reset`, { method: 'POST', body: {} }); toast('2 etapas removido; a pessoa entra só com a senha e pode ligar de novo'); $('#modal').close(); refresh();
  };
  const del = $('#delBtn');
  if (del) del.onclick = async () => {
    if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Confirmar exclusão'; return; }
    try { await api(`users/${u.id}`, { method: 'DELETE' }); dlg.close(); toast('Acesso excluído'); refresh(); } catch (err) { $('#formErr').textContent = err.message; }
  };
  form.oninput = null;
  const sp = $('#u_space');
  if (sp) sp.onchange = () => {
    $('#u_person_f').hidden = sp.value !== '0';
    // Na conta separada a pessoa manda nos próprios dados; nos dados principais, o padrão é parceiro(a).
    const r = form.querySelector(`input[name=u_role][value=${sp.value === 'own' ? 'admin' : 'parceiro'}]`); if (r) r.checked = true;
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      name: $('#u_name').value, login: $('#u_login').value, role: form.querySelector('input[name=u_role]:checked')?.value,
      person_id: $('#u_person').value ? Number($('#u_person').value) : null, email: $('#u_email').value, phone: $('#u_phone').value,
    };
    if ($('#u_pass').value) body.password = $('#u_pass').value;
    if (sp) body.space = sp.value;
    if (editing) body.active = $('#u_active').checked;
    try {
      await api(editing ? `users/${u.id}` : 'users', { method: editing ? 'PUT' : 'POST', body });
      dlg.close(); toast(editing ? 'Acesso atualizado' : 'Acesso criado'); refresh();
    } catch (err) { $('#formErr').textContent = err.message; }
  };
  dlg.showModal();
}

// Liga o formulário do perfil depois de desenhar a tela.
const _afterRenderHelp = afterRender;
afterRender = function () {
  _afterRenderHelp();
  const hs = $('#helpSearch'); if (!hs) return;
  hs.onsubmit = async (e) => {
    e.preventDefault();
    const q = hs.q.value.trim(); if (!q) return;
    const out = $('#helpResults'); out.innerHTML = '<div class="muted small" style="margin-top:10px">Procurando…</div>';
    const r = await api(`ajuda?q=${encodeURIComponent(q)}`);
    out.innerHTML = r.results.length
      ? `<div class="faq" style="margin-top:12px">${r.results.map((f, i) => `<details class="faq-item" ${i === 0 ? 'open' : ''}><summary>${esc(f.q)}</summary>${faqBody(f, true)}</details>`).join('')}</div>
         <p class="small" style="margin-top:10px">Não era isso? <button type="button" class="link-btn" data-ticket-from="${esc(q.slice(0, 120))}">Falar com o suporte</button></p>`
      : `<div class="of-result dry" style="margin-top:12px">Não achei uma resposta pronta para “${esc(q)}”. Tente com outras palavras, veja as perguntas frequentes abaixo, ou <button type="button" class="link-btn" data-ticket-from="${esc(q.slice(0, 120))}">fale com o suporte</button>.</div>`;
  };
};

const _afterRenderPantry = afterRender;
afterRender = function () {
  _afterRenderPantry();
  const pp = $('#pantryPrice'); if (!pp) return;
  pp.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api(`despensa/price?item=${pp.item.value}&price=${encodeURIComponent(String(pp.price.value).replace(',', '.'))}`);
      const cls = { barato: 'good', caro: 'neg', normal: '', sem_historico: 'muted' }[r.verdict] || '';
      $('#pantryPriceOut').innerHTML = `<div class="of-result" style="background:${r.verdict === 'caro' ? 'var(--red-soft, #fee2e2)' : r.verdict === 'barato' ? 'var(--green-soft)' : 'var(--blue-soft)'}"><b class="${cls}">${esc(r.text)}</b>${r.best ? '<div class="small good">É o menor preço que você já registrou.</div>' : ''}${r.last_store ? `<div class="small muted">Última compra em ${esc(r.last_store)}.</div>` : ''}</div>`;
    } catch (err) { $('#pantryPriceOut').innerHTML = `<div class="neg small">${esc(err.message)}</div>`; }
  };
};

const _afterRenderSec = afterRender;
afterRender = function () {
  _afterRenderSec();
  const on = $('#totpOn'); const off = $('#totpOff'); const box = $('#totpBox');
  if (on) on.onclick = async () => {
    on.hidden = true;
    const r = await api('me/2fa/start', { method: 'POST', body: {} });
    box.innerHTML = `<div class="totp-box">
      <p><b>1.</b> No celular, abra o app autenticador (Google Authenticator, Authy, 1Password…) e adicione uma conta: <a href="${esc(r.otpauth)}">toque aqui se estiver no celular</a>, ou digite a chave:</p>
      <div class="totp-key">${esc(r.secret)}</div>
      <p><b>2.</b> Digite o código de 6 números que aparece:</p>
      <form id="totpForm" class="form-row" style="align-items:end"><div class="field"><input name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" required></div><div class="field"><button class="btn primary">Confirmar</button></div></form>
      <div class="error" id="totpErr"></div></div>`;
    $('#totpForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const x = await api('me/2fa/enable', { method: 'POST', body: { code: e.target.code.value } });
        box.innerHTML = `<div class="totp-box"><b>Login em 2 etapas ligado ✓</b><div class="small">Guarde estes códigos de recuperação num lugar seguro (cada um funciona 1 vez, se você perder o celular). Eles não aparecem de novo:</div>
          <div style="font:600 15px ui-monospace,monospace;display:grid;grid-template-columns:repeat(2,max-content);gap:4px 24px;padding:8px 0;user-select:all">${x.recovery_codes.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
          <button class="btn sm" id="totpDone">Já guardei</button></div>`;
        $('#totpDone').onclick = () => refresh();
      } catch (err) { $('#totpErr').textContent = err.message; }
    };
  };
  if (off) off.onclick = () => {
    box.innerHTML = `<form id="totpOffForm" class="form-row" style="align-items:end;margin:6px 0 12px"><div class="field"><label>Sua senha</label><input name="password" type="password" autocomplete="current-password" required></div><div class="field"><button class="btn danger">Desligar 2 etapas</button></div></form><div class="error" id="totpErr"></div>`;
    $('#totpOffForm').onsubmit = async (e) => { e.preventDefault(); try { await api('me/2fa/disable', { method: 'POST', body: { password: e.target.password.value } }); toast('2 etapas desligado'); refresh(); } catch (err) { $('#totpErr').textContent = err.message; } };
  };
  const rv = $('#revokeSessions'); if (rv) rv.onclick = async () => { const r = await api('me/sessions', { method: 'POST', body: {} }); toast(`Saiu de ${r.revoked} aparelho(s)`); refresh(); };
  const del = $('#deleteMeBtn'); if (del) del.onclick = () => {
    $('#deleteMeBox').innerHTML = `<form id="deleteMeForm" class="inc-card" style="margin-top:12px"><b class="neg">Excluir minha conta</b>
      <div class="small">${state.user.own_space ? 'Sua conta separada e todos os dados dela serão apagados.' : 'Seu acesso será apagado. Os dados da casa continuam (são compartilhados).'} Antes, se quiser, use “Baixar meus dados”. Não dá para desfazer.</div>
      <div class="form-row"><div class="field"><label>Sua senha</label><input name="password" type="password" autocomplete="current-password" required></div><div class="field"><label>Digite EXCLUIR</label><input name="confirm" autocomplete="off" required></div></div>
      <div class="error" id="deleteErr"></div><div><button class="btn danger">Excluir para sempre</button></div></form>`;
    $('#deleteMeForm').onsubmit = async (e) => { e.preventDefault(); try { await api('me/delete', { method: 'POST', body: { password: e.target.password.value, confirm: e.target.confirm.value } }); location.reload(); } catch (err) { $('#deleteErr').textContent = err.message; } };
  };
};

const _afterRenderOF = afterRender;
afterRender = function () {
  _afterRenderOF();
  const cf = $('#ofConfig'); if (!cf) return;
  const show = (html) => { const r = $('#ofResult'); if (r) r.innerHTML = html; };
  cf.onsubmit = async (e) => {
    e.preventDefault();
    const body = { client_id: cf.client_id.value, since: cf.since.value, auto: cf.auto.checked, pending: cf.pending.checked };
    if (cf.client_secret.value) body.client_secret = cf.client_secret.value;
    try { await api('openfinance/config', { method: 'PUT', body }); if (body.client_secret) await api('openfinance/test', { method: 'POST', body: {} }); toast(body.client_secret ? 'Chave salva e testada ✓' : 'Salvo'); refresh(); } catch (err) { toast(err.message); refresh(); }
  };
  const t = $('#ofTest'); if (t) t.onclick = async () => { t.disabled = true; try { await api('openfinance/test', { method: 'POST', body: {} }); toast('Chave funcionando ✓'); } catch (err) { toast(err.message); } t.disabled = false; };
  const ai = $('#ofAddItem'); if (ai) ai.onsubmit = async (e) => {
    e.preventDefault(); const b = ai.querySelector('button'); b.disabled = true; b.textContent = 'Conectando…';
    try { await api('openfinance/items', { method: 'POST', body: { item_id: ai.item_id.value, name: ai.name.value } }); toast('Conexão adicionada: agora ligue as contas'); refresh(); } catch (err) { toast(err.message); b.disabled = false; b.textContent = 'Adicionar'; }
  };
  const save = async (id) => {
    const link = $(`[data-of-link="${id}"]`).value; const acc = $(`[data-of-account="${id}"]`); const card = $(`[data-of-card="${id}"]`);
    if ((link === 'conta' && !acc?.value) || (link === 'cartao' && !card?.value)) return; // espera escolher
    try { await api(`openfinance/accounts/${id}`, { method: 'PUT', body: { link, account_id: acc?.value || null, card_id: card?.value || null } }); toast('Ligação salva'); refresh(); } catch (err) { toast(err.message); }
  };
  document.querySelectorAll('[data-of-link]').forEach((el) => { el.onchange = () => {
    const id = el.dataset.ofLink; const other = $(`[data-of-account="${id}"]`) || $(`[data-of-card="${id}"]`);
    if (other) other.disabled = el.value === 'ignorar';
    if (el.value !== 'pendente') save(id);
  }; });
  document.querySelectorAll('[data-of-account],[data-of-card]').forEach((el) => { el.onchange = () => {
    const id = el.dataset.ofAccount || el.dataset.ofCard; const l = $(`[data-of-link="${id}"]`);
    if (l.value === 'pendente') l.value = el.dataset.ofCard ? 'cartao' : 'conta';
    save(id);
  }; });
  document.querySelectorAll('[data-of-sync]').forEach((b) => { b.onclick = async () => {
    const dry = b.dataset.ofSync === 'dry'; b.disabled = true; const old = b.textContent; b.textContent = dry ? 'Buscando…' : 'Sincronizando…';
    try {
      const r = await api('openfinance/sync', { method: 'POST', body: { dry } });
      show(`<div class="of-result ${dry ? 'dry' : ''}"><b>${dry ? 'Prévia (nada foi gravado):' : 'Sincronizado:'}</b> ${r.criados} lançamentos · ${r.compras} compras no cartão · ${r.recebimentos} recebimentos · ${r.contas_pagas} contas pagas · ${r.transferencias} transferências · ${r.ligados} já existiam · ${r.ignorados} ignorados${r.erros.length ? `<div class="neg small">${r.erros.map(esc).join('<br>')}</div>` : ''}
        ${r.itens.length ? `<details ${dry ? 'open' : ''}><summary class="small">Ver itens (${r.itens.length})</summary><div class="small" style="max-height:320px;overflow:auto;margin-top:6px;line-height:1.6">${r.itens.map(esc).join('<br>')}</div></details>` : ''}
        ${dry && (r.criados + r.compras + r.recebimentos + r.contas_pagas) ? '<div style="margin-top:8px"><button class="btn primary sm" data-of-sync="real">Confirmar e importar</button></div>' : ''}</div>`);
      if (!dry) { toast('Sincronizado'); GETC.clear(); setTimeout(() => refresh(), 50); } else afterRender();
    } catch (err) { show(`<div class="of-result"><span class="neg">${esc(err.message)}</span></div>`); }
    b.disabled = false; b.textContent = old;
  }; });
  document.querySelectorAll('[data-of-undo]').forEach((b) => { b.onclick = async () => {
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirmar'; return; }
    try { const r = await api('openfinance/undo', { method: 'POST', body: { run_id: Number(b.dataset.ofUndo) } }); toast(`Desfeito (${r.undone} movimentações)`); refresh(); } catch (err) { toast(err.message); }
  }; });
  document.querySelectorAll('[data-of-refresh]').forEach((b) => { b.onclick = async () => { b.disabled = true; try { await api(`openfinance/items/${encodeURIComponent(b.dataset.ofRefresh)}`, { method: 'PUT', body: {} }); toast('Contas atualizadas'); refresh(); } catch (err) { toast(err.message); b.disabled = false; } }; });
  document.querySelectorAll('[data-of-del]').forEach((b) => { b.onclick = async () => {
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirmar remoção'; return; }
    await api(`openfinance/items/${encodeURIComponent(b.dataset.ofDel)}`, { method: 'DELETE' }); toast('Conexão removida (os lançamentos importados ficam)'); refresh();
  }; });
  document.querySelectorAll('[data-of-adjust]').forEach((b) => { b.onclick = async () => { const r = await api(`openfinance/accounts/${b.dataset.ofAdjust}/adjust`, { method: 'POST', body: {} }); toast(`Saldo ajustado (${money(r.diff)})`); refresh(); }; });
};

const _afterRender = afterRender;
afterRender = function () {
  _afterRender();
  const uf = $('#updateFile'); const rb = $('#rollbackBtn');
  const upMsg = (t) => { const m = $('#updateMsg'); if (m) m.textContent = t; };
  // Espera o app voltar depois de reiniciar e recarrega a página.
  const waitBack = (target) => {
    const t0 = Date.now();
    const tick = async () => {
      try {
        const h = await (await fetch('/api/health', { cache: 'no-store' })).json();
        if (h.ok && (!target || h.version === target)) { upMsg('Pronto! Abrindo a versão nova…'); return setTimeout(() => location.reload(), 600); }
        if (h.ok && Date.now() - t0 > 20000) return upMsg(`O app voltou na versão ${h.version}: a nova não iniciou e ele voltou sozinho para a anterior.`);
      } catch { /* ainda reiniciando */ }
      if (Date.now() - t0 < 90000) setTimeout(tick, 1500); else upMsg('Demorou para voltar. Confira o app no painel do ZimaOS.');
    };
    setTimeout(tick, 2500);
  };
  if (uf) uf.onchange = async () => {
    const f = uf.files[0]; if (!f) return;
    upMsg(`Enviando e conferindo ${f.name}…`);
    try {
      const r = await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: f });
      const j = await r.json();
      if (!r.ok) { upMsg(j.error || 'Não deu para atualizar'); uf.value = ''; return; }
      upMsg(`Versão ${j.version} instalada (backup feito). Reiniciando o app…`);
      waitBack(j.version);
    } catch (err) { upMsg(err.message); }
  };
  if (rb) rb.onclick = async () => {
    if (!rb.dataset.armed) { rb.dataset.armed = '1'; rb.textContent = 'Clique de novo para confirmar'; return; }
    rb.disabled = true;
    try { const r = await fetch('/api/update/rollback', { method: 'POST' }); const j = await r.json(); if (!r.ok) throw new Error(j.error); upMsg(`Voltando para a versão ${j.version}. Reiniciando…`); waitBack(null); } catch (err) { upMsg(err.message); rb.disabled = false; }
  };
  const bf = $('#backupForm');
  if (bf) bf.onsubmit = async (e) => {
    e.preventDefault();
    const body = { backup_enabled: bf.backup_enabled.checked, backup_every_hours: Number(bf.backup_every_hours.value), backup_time: bf.backup_time.value, backup_keep: Number(bf.backup_keep.value), backup_extra_dir: bf.backup_extra_dir.value };
    await api('backups', { method: 'PUT', body }); toast('Backup configurado'); refresh();
  };
  const pf2 = $('#prefsForm');
  if (pf2) pf2.onsubmit = async (e) => {
    e.preventDefault();
    const body = {};
    for (const el of pf2.elements) {
      if (!el.name) continue;
      body[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    }
    await api('notify-prefs', { method: 'PUT', body }); toast('Notificações salvas');
  };
  const tf = $('#tokenForm');
  if (tf) tf.onsubmit = async (e) => { e.preventDefault(); state.newToken = await api('tokens', { method: 'POST', body: { name: $('#tokenName').value } }); refresh(); };
  const as = $('#allowSignup');
  if (as) as.onchange = async () => { await api('settings', { method: 'PUT', body: { allow_signup: as.checked } }); state.signup = as.checked; toast(as.checked ? '“Criar conta” ligado' : '“Criar conta” desligado'); };
  const pf = $('#profileForm');
  if (!pf) return;
  bindPhoto('p_photo');
  pf.onsubmit = async (e) => {
    e.preventDefault();
    const body = { name: $('#p_name').value, email: $('#p_email').value, phone: $('#p_phone').value, photo: $('#p_photo').value };
    if ($('#p_new').value) { body.new_password = $('#p_new').value; body.current_password = $('#p_cur').value; }
    try { const r = await api('me', { method: 'PUT', body }); state.user = r.user; toast('Perfil salvo'); refresh(); } catch (err) { $('#profileErr').textContent = err.message; }
  };
};

// ---------- início ----------
async function start() {
  try {
    const me = await api('me');
    if (me.setup) return showSetup();
    if (!me.user.onboarded) return showOnboarding(me);
    state.user = me.user; state.roles = me.roles; state.signup = me.signup; state.spaces = me.spaces || [];
    const as = $('#authScreen'); if (as) as.hidden = true;
    $('#app').hidden = false;
    $('#addBtn').closest('.dropdown').hidden = !can('launch');
    $('#addMenu').innerHTML = ADD_MENU.filter(([f]) => can(['transaction', 'reserve', 'move', 'receive', 'transfer'].includes(f) ? 'launch' : 'edit'))
      .map(([f, ic, l]) => `<button data-form="${f}">${ic.startsWith('img:') ? illus(ic.slice(4), 'menu-ic') : `<span class="menu-ic">${ic}</span>`}${l}</button>`).join('');
    route();
    if (store.get(tourKey(), '') !== '1') setTimeout(() => { if (state.tourStep == null) startTour(0); }, 900);
    loadBell(); clearInterval(state.bellTimer); state.bellTimer = setInterval(loadBell, 60000);
    if ('serviceWorker' in navigator && !window.__bootDemo && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { /* 401 já mostra o login */ }
}

start();
