// API do Casa em Dia (/api/...), no formato que a interface original espera.
import { db, emailDoLogin } from './supabase.js';
import { carregar, tudo } from './dados.js';
import { RECURSOS, limpar } from './recursos.js';
import {
  resumo, itensAPagar, emprestimoInfo, contaDetalhe, receitaNoMes, valorReceita, bemInfo, caixinhaInfo, assinaturaCobra,
  mesDaFatura, faturaDoMes,
} from './calc.js';
import { hoje, mesAtual, somaMes, dataNoMes, difDias, difMeses, fimDoMes, r2 } from './fmt.js';
import * as despensa from './despensa.js';
import { randomBytes } from 'node:crypto';
import { normTel, mascara, novoCodigo, cifrar } from './whatsapp.js';

export class Erro extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const VERSAO = '2026.11.17-nuvem';

export const NIVEIS = {
  admin: { label: 'Administrador', desc: 'Vê e muda tudo, inclusive os acessos das outras pessoas.', perms: ['launch', 'edit', 'settings', 'manage_users', 'server'] },
  parceiro: { label: 'Parceiro(a)', desc: 'Vê e muda tudo dos dados da casa, menos os acessos.', perms: ['launch', 'edit', 'settings'] },
  lancador: { label: 'Lançador', desc: 'Vê tudo e lança gastos, entradas e pagamentos. Não muda cadastros.', perms: ['launch'] },
  leitor: { label: 'Só leitura', desc: 'Só vê, não muda nada.', perms: [] },
};

// o login com Google está ligado no Supabase? (guardado por 5 minutos)
let googleCache = { ate: 0, valor: false };
async function googleLigado() {
  if (Date.now() < googleCache.ate) return googleCache.valor;
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
    const j = await r.json();
    googleCache = { ate: Date.now() + 300000, valor: !!j?.external?.google };
  } catch { googleCache = { ate: Date.now() + 30000, valor: false }; }
  return googleCache.valor;
}

// ---------- sessão ----------
async function sessao(s, obrigatorio = true) {
  const { data: { user } } = await s.auth.getUser();
  if (!user) { if (obrigatorio) throw new Erro('login', 401); return null; }
  let [{ data: m }, { data: pessoa }] = await Promise.all([
    s.from('membros').select('*').eq('user_id', user.id).maybeSingle(),
    s.from('pessoas').select('id,name').eq('user_id', user.id).maybeSingle(),
  ]);
  if (!m || !m.ativo) { if (obrigatorio) throw new Erro('login', 401); return null; }
  // chave de IA: age como a pessoa que criou a chave
  if (m.token) ({ data: pessoa } = await s.from('pessoas').select('id,name').eq('user_id', m.criado_por).maybeSingle());
  const nivel = NIVEIS[m.nivel] || NIVEIS.leitor;
  return {
    auth: user, m, pessoa,
    user: {
      id: m.id, login: m.login || user.email, name: m.nome || pessoa?.name || m.login, photo: m.foto, email: m.email_contato || '', phone: m.telefone || '',
      role: m.nivel, role_label: nivel.label, perms: nivel.perms, person_id: pessoa?.id ?? null, onboarded: m.onboarded,
      must_change: false, own_space: false,
    },
  };
}
const exige = (u, perm) => { if (!u.user.perms.includes(perm)) throw new Erro('Seu acesso não permite fazer isso', 403); };
const ok = (x) => x ?? { ok: true };
const erroDb = (error) => { if (error) throw new Erro(error.message.replace(/^.*?: /, '')); };
const num = (v) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

// ---------- roteamento ----------
export async function rotear(metodo, partes, url, body, cliente) {
  const s = cliente || await db();
  const [r0, r1, r2_, r3] = partes;
  const q = Object.fromEntries(url.searchParams);
  const rota = `${metodo} ${partes.join('/')}`;

  // sem login
  if (rota === 'GET health') return { ok: true, version: VERSAO };
  if (rota === 'GET login-info') {
    const [{ data: vazio }, google] = await Promise.all([s.rpc('sistema_vazio'), googleLigado()]);
    return { setup: !!vazio, signup: true, default_admin: false, google };
  }
  if (rota === 'POST login') {
    const { error } = await s.auth.signInWithPassword({ email: emailDoLogin(body.login), password: String(body.password || '') });
    if (error) throw new Erro(/banned/i.test(error.message) ? 'Este acesso está desativado' : 'Login ou senha incorretos', 400);
    return ok();
  }
  if (rota === 'POST setup') {
    const { error } = await s.rpc('criar_primeiro_acesso', { p_login: body.login, p_senha: body.password }); erroDb(error);
    const r = await s.auth.signInWithPassword({ email: emailDoLogin(body.login), password: body.password }); erroDb(r.error);
    return ok();
  }
  if (rota === 'POST signup') {
    if (!body.accept_terms) throw new Erro('Aceite a política de privacidade para criar a conta');
    const { error } = await s.rpc('criar_conta', { p_nome: body.name, p_login: body.login, p_senha: body.password }); erroDb(error);
    const r = await s.auth.signInWithPassword({ email: emailDoLogin(body.login), password: body.password }); erroDb(r.error);
    return ok();
  }
  if (rota === 'POST logout') { await s.auth.signOut(); return ok(); }
  // entrar com o Google (Supabase Auth): vai para o Google e volta em /api/auth/callback
  if (rota === 'GET auth/google') {
    const { data, error } = await s.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${url.origin}/api/auth/callback`, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
    if (error || !data?.url) return { __redirect: '/app#erro-google' };
    return { __redirect: data.url };
  }
  if (rota === 'GET auth/callback') {
    const vinculo = q.next === 'perfil';
    // o Supabase devolve o erro na URL quando não dá (ex.: conta Google já usada em outro cadastro)
    if (q.error || q.error_description) {
      const jaUsada = /already|exists|linked/i.test(q.error_description || '');
      return { __redirect: vinculo ? `/app?google=${jaUsada ? 'ja-usada' : 'erro'}#perfil` : '/app#erro-google' };
    }
    if (q.code) {
      const { error } = await s.auth.exchangeCodeForSession(q.code);
      if (error) return { __redirect: vinculo ? `/app?google=${/already|exists/i.test(error.message) ? 'ja-usada' : 'erro'}#perfil` : '/app#erro-google' };
    }
    return { __redirect: vinculo ? '/app?google=ok#perfil' : '/app' };
  }

  const u = await sessao(s);

  if (rota === 'GET me') {
    return {
      user: u.user, roles: NIVEIS, signup: false, first_admin: false,
      spaces: [{ id: 0, name: 'Dados principais (os mesmos que você vê)' }],
    };
  }
  if (rota === 'PUT me' || rota === 'POST onboarding') {
    if (body.new_password) {
      const { error } = await s.rpc('trocar_minha_senha', { p_atual: body.current_password || '', p_nova: body.new_password }); erroDb(error);
    }
    const upd = { nome: body.name || u.m.nome, foto: body.photo ?? u.m.foto, email_contato: body.email || null, telefone: body.phone || null };
    if (rota === 'POST onboarding') upd.onboarded = true;
    erroDb((await s.from('membros').update(upd).eq('user_id', u.auth.id)).error);
    if (u.pessoa) {
      const p = { name: body.name || u.pessoa.name };
      if (rota === 'POST onboarding' && body.salary !== undefined && String(body.salary).trim() !== '') p.salary = num(body.salary);
      await s.from('pessoas').update(p).eq('id', u.pessoa.id);
    }
    return { user: (await sessao(s)).user };
  }
  // ---------- conta Google ligada a um cadastro que já existe ----------
  if (rota === 'GET me/google') {
    const { data } = await s.auth.getUserIdentities();
    const g = (data?.identities || []).find((i) => i.provider === 'google');
    return { disponivel: await googleLigado(), conectado: !!g, email: g?.identity_data?.email || null, desde: g?.created_at || null };
  }
  if (rota === 'GET auth/google/vincular') {
    if (u.m.token) throw new Erro('Entre com a sua conta', 403);
    const { data, error } = await s.auth.linkIdentity({ provider: 'google', options: { redirectTo: `${url.origin}/api/auth/callback?next=perfil`, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
    if (error || !data?.url) return { __redirect: `/app?google=${/manual linking/i.test(error?.message || '') ? 'desligado' : 'erro'}#perfil` };
    return { __redirect: data.url };
  }
  if (rota === 'DELETE me/google') {
    const { data } = await s.auth.getUserIdentities();
    const lista = data?.identities || [];
    const g = lista.find((i) => i.provider === 'google');
    if (!g) return ok();
    if (lista.length < 2) throw new Erro('Esta conta só entra pelo Google. Para desconectar, defina antes um login e senha (peça ao administrador da casa).');
    const { error } = await s.auth.unlinkIdentity(g); erroDb(error);
    return ok();
  }
  if (r0 === 'me') throw new Erro('Recurso ainda não disponível na versão da nuvem', 404); // me/security, 2fa, export…

  const pid = (v) => (v === 'casal' ? 'casal' : v ? Number(v) : u.pessoa?.id);
  const mes = q.month || mesAtual();

  // ---------- painel ----------
  if (rota === 'GET summary') { const d = await carregar(s); return resumo(d, mes, pid(q.person), u.auth.id); }
  if (rota === 'GET banks') return tudo(s, 'bancos', { ordem: 'bank' });
  if (rota === 'GET cashflow') {
    const d = await carregar(s); const n = Number(q.n) || 6;
    return Array.from({ length: n }, (_, i) => somaMes(mes, i - n + 1)).map((m) => {
      const r = resumo(d, m, pid(q.person), u.auth.id);
      return { month: m, income: r.balance.income, expenses: r2(r.balance.income - r.balance.leftover), leftover: r.balance.leftover };
    });
  }
  if (rota === 'GET transactions' && q.month) {
    const { data, error } = await s.from('lancamentos').select('*').gte('date', `${mes}-01`).lte('date', fimDoMes(mes)).eq('kind', 'normal').order('date', { ascending: false }).order('id', { ascending: false });
    erroDb(error);
    const { data: ligados } = await s.from('recebimentos').select('lancamento_id');
    const fora = new Set((ligados || []).map((x) => x.lancamento_id));
    return data.filter((t) => !fora.has(t.id)).map((t) => ({ ...t, amount: Number(t.amount) }));
  }
  if (r0 === 'loan-detail' && metodo === 'GET') {
    const d = await carregar(s); const e = d.emprestimos.find((x) => x.id === Number(r1));
    if (!e) throw new Erro('Empréstimo não encontrado', 404);
    return emprestimoInfo(d, e, mes);
  }
  if (r0 === 'account-detail' && metodo === 'GET') {
    const d = await carregar(s); const c = d.contas.find((x) => x.id === Number(r1));
    if (!c) throw new Erro('Conta não encontrada', 404);
    return contaDetalhe(d, c, mes, itensAPagar(d, mes));
  }
  if (rota === 'GET incomes-overview') return visaoReceitas(await carregar(s), mes, q.person ? Number(q.person) : null);
  if (rota === 'GET subscriptions-overview') return visaoAssinaturas(await carregar(s), mes);
  if (r0 === 'asset-detail' && metodo === 'GET') {
    const d = await carregar(s); const b = d.bens.find((x) => x.id === Number(r1));
    if (!b) throw new Erro('Bem não encontrado', 404);
    return detalheBem(d, b);
  }

  // ---------- ações ----------
  if (rota === 'POST pay') { exige(u, 'launch'); return pagar(s, u, body); }
  if (rota === 'POST adjust') {
    exige(u, 'launch');
    const ref = body.type === 'reminder' ? body.date : body.month;
    if (!ref) throw new Erro('Informe o mês');
    const reg = { item_type: body.type, item_id: Number(body.id), ref, amount: body.amount === null || body.amount === undefined || body.amount === '' ? null : num(body.amount), note: body.note || null, skip: !!body.skip };
    const { data: ex } = await s.from('ajustes_ocorrencia').select('id,skip').eq('item_type', reg.item_type).eq('item_id', reg.item_id).eq('ref', ref).maybeSingle();
    if (!body.skip && ex) reg.skip = false;
    if (!reg.skip && reg.amount === null && !reg.note) { if (ex) await s.from('ajustes_ocorrencia').delete().eq('id', ex.id); return ok(); }
    erroDb((ex ? await s.from('ajustes_ocorrencia').update(reg).eq('id', ex.id) : await s.from('ajustes_ocorrencia').insert(reg)).error);
    return ok();
  }
  if (rota === 'POST settle') {
    exige(u, 'launch');
    const { data: ex } = await s.from('acertos').select('id').eq('month', mes).maybeSingle();
    erroDb((ex ? await s.from('acertos').update({ done: !!body.done }).eq('id', ex.id) : await s.from('acertos').insert({ month: mes, done: !!body.done })).error);
    return ok();
  }
  if (rota === 'POST transfer') {
    exige(u, 'launch');
    const de = Number(body.from_account_id); const para = Number(body.to_account_id); const v = num(body.amount);
    if (!de || !para || de === para) throw new Erro('Escolha duas contas diferentes');
    if (!(v > 0)) throw new Erro('Informe o valor');
    const base = { date: body.date || hoje(), amount: v, kind: 'transferencia', person_id: u.pessoa?.id, category: 'Transferência entre contas' };
    erroDb((await s.from('lancamentos').insert([
      { ...base, type: 'saida', account_id: de, description: body.note || 'Transferência enviada' },
      { ...base, type: 'entrada', account_id: para, description: body.note || 'Transferência recebida' },
    ])).error);
    return ok();
  }
  if (rota === 'POST receive') {
    exige(u, 'launch');
    const { data: r } = await s.from('receitas').select('*').eq('id', Number(body.income_id)).maybeSingle();
    if (!r) throw new Erro('Receita não encontrada');
    const v = num(body.amount); if (!(v > 0)) throw new Erro('Informe o valor recebido');
    const conta = Number(body.account_id) || null; const data = body.date || hoje();
    const { data: l, error } = await s.from('lancamentos').insert({ date: data, amount: v, type: 'entrada', kind: 'normal', account_id: conta, person_id: r.owner_id, description: r.name, category: r.category || 'Receita' }).select('id').single();
    erroDb(error);
    erroDb((await s.from('recebimentos').insert({ income_id: r.id, ref_month: body.ref_month || data.slice(0, 7), date: data, amount: v, account_id: conta, note: body.note || null, lancamento_id: l.id })).error);
    return ok();
  }
  if (rota === 'POST receive/undo') {
    exige(u, 'launch');
    const { data: r } = await s.from('recebimentos').select('*').eq('id', Number(body.id)).maybeSingle();
    if (r) { await s.from('recebimentos').delete().eq('id', r.id); if (r.lancamento_id) await s.from('lancamentos').delete().eq('id', r.lancamento_id); }
    return ok();
  }
  if (rota === 'POST asset-value') { exige(u, 'edit'); return valorBem(s, body); }
  if (r0 === 'fipe' && metodo === 'GET') return fipe(partes.slice(1));
  if (rota === 'PUT settings') {
    exige(u, 'settings');
    const upd = {};
    for (const k of ['daily_budget', 'housing_ref', 'reserve_goal']) if (k in body) upd[k] = num(body[k]);
    if ('split_mode' in body) upd.split_mode = body.split_mode === 'igual' ? 'igual' : 'proporcional';
    if ('allow_signup' in body) upd.allow_signup = !!body.allow_signup;
    erroDb((await s.from('ajustes').update(upd).eq('casa_id', u.m.casa_id)).error);
    return ok();
  }

  // ---------- despensa ----------
  if (r0 === 'despensa') return despensa.rota(s, u, metodo, partes.slice(1), q, body, exige);

  // ---------- notificações, IA, suporte, backup ----------
  if (rota === 'GET notifications') {
    const { data } = await s.from('notificacoes').select('*').or(`user_id.is.null,user_id.eq.${u.auth.id}`).order('created_at', { ascending: false }).limit(50);
    return { list: data || [], unread: (data || []).filter((n) => !n.read).length };
  }
  if (rota === 'POST notifications/read') {
    let qq = s.from('notificacoes').update({ read: true });
    qq = body.id ? qq.eq('id', Number(body.id)) : qq.eq('read', false);
    await qq; return ok();
  }
  if (rota === 'POST notifications/check') return { created: await gerarAvisos(s, u) };
  if (rota === 'GET notify-prefs') return { prefs: prefsDe(u.m), devices: [], vapid: '' };
  if (rota === 'PUT notify-prefs') { erroDb((await s.from('membros').update({ avisos: { ...prefsDe(u.m), ...body } }).eq('user_id', u.auth.id)).error); return ok(); }
  if (r0 === 'push') throw new Erro('As notificações no celular ainda não estão ligadas na versão da nuvem. Os avisos aparecem no sininho.');
  // ---------- WhatsApp (Meu perfil) ----------
  if (rota === 'GET whatsapp') {
    const { data: v } = await s.from('whatsapp_vinculos').select('telefone,confirmado,codigo_expira,confirmado_em,ultimo_uso').eq('user_id', u.auth.id).maybeSingle();
    return { ativo: !!process.env.WHATSAPP_CHAVE_MESTRA, numero_agente: process.env.WHATSAPP_NUMERO || null, ligado: !!v?.confirmado, pendente: !!v && !v.confirmado,
      telefone: v ? mascara(v.telefone) : null, expira: v?.codigo_expira || null, ultimo_uso: v?.ultimo_uso || null };
  }
  if (rota === 'POST whatsapp') {
    if (u.m.token) throw new Erro('Entre com a sua conta', 403);
    const tel = normTel(body.telefone);
    if (!/^\d{12,13}$/.test(tel)) throw new Erro('Número inválido. Use DDD e número, ex.: (11) 91234-5678');
    const chave = `ced_${randomBytes(24).toString('base64url')}`;
    const { data: tokenId, error } = await s.rpc('criar_chave_ia', { p_nome: 'WhatsApp', p_chave: chave }); erroDb(error);
    const codigo = novoCodigo();
    const r = await s.rpc('whatsapp_iniciar', { p_telefone: tel, p_codigo: codigo, p_cifrada: cifrar(chave), p_token: tokenId });
    if (r.error) { await s.rpc('revogar_chave_ia', { p_id: tokenId }); erroDb(r.error); }
    return { codigo, telefone: mascara(tel), numero_agente: process.env.WHATSAPP_NUMERO || null, expira_min: 30 };
  }
  if (rota === 'DELETE whatsapp') { const { error } = await s.rpc('whatsapp_desligar'); erroDb(error); return ok(); }

  if (rota === 'GET tokens') {
    const { data } = await s.from('membros').select('id,nome,token_prefixo,criado_em,ultimo_uso,criado_por').eq('token', true).order('id');
    return (data || []).filter((t) => t.criado_por === u.auth.id || u.user.perms.includes('manage_users'))
      .map((t) => ({ id: t.id, name: t.nome, prefix: t.token_prefixo, created_at: t.criado_em, last_used: t.ultimo_uso }));
  }
  if (rota === 'POST tokens') {
    if (u.m.token) throw new Erro('Uma chave de IA não cria outras chaves', 403);
    const chave = `ced_${randomBytes(24).toString('base64url')}`;
    const { data: id, error } = await s.rpc('criar_chave_ia', { p_nome: String(body.name || '').slice(0, 60), p_chave: chave }); erroDb(error);
    return { id, url: `${url.origin}/mcp/${chave}`, key: chave };
  }
  if (metodo === 'DELETE' && r0 === 'tokens') { const { error } = await s.rpc('revogar_chave_ia', { p_id: Number(r1) }); erroDb(error); return ok(); }
  if (rota === 'GET ajuda') return ajuda(q.q);
  if (r0 === 'ajuda') return ok();
  if (rota === 'GET suporte') return { admin: false, tickets: [] };
  if (r0 === 'suporte') throw new Erro('Na versão da nuvem não há chamados: fale direto com o Diego.');
  if (rota === 'GET backups') return { demo: true, list: [] };
  if (rota === 'GET server-usage') return { demo: true };
  if (rota === 'GET openfinance') throw new Erro('Bancos conectados ainda não estão disponíveis na versão da nuvem.');
  if (rota === 'GET audit') return [];
  if (rota === 'GET export') return exportar(s, u);
  if (rota === 'POST import') { exige(u, 'manage_users'); return importar(s, u, body); }
  if (rota === 'POST reset') { exige(u, 'manage_users'); return zerar(s, u, body); }

  // ---------- acessos ----------
  if (r0 === 'users') return acessos(s, u, metodo, r1, r2_, body);

  // ---------- cadastros (CRUD) ----------
  const cfg = RECURSOS[r0];
  if (cfg) return crud(s, u, cfg, r0, metodo, r1, body, mes);

  throw new Erro(`Rota desconhecida: ${rota}`, 404);
}

// ---------- CRUD ----------
async function crud(s, u, cfg, nome, metodo, id, body, mes) {
  const tabela = cfg.tabela;
  if (metodo === 'GET') {
    if (id) {
      const { data, error } = await s.from(tabela).select('*').eq('id', Number(id)).maybeSingle();
      erroDb(error); if (!data) throw new Erro('Não encontrado', 404);
      if (nome === 'people') { data.is_me = data.user_id === u.auth.id; data.salary = Number(data.salary) || 0; }
      return data;
    }
    const ordem = { transactions: 'date', reserve: 'date', banks: 'bank', bills: 'due_day', people: 'id' }[nome] || 'id';
    const lista = await tudo(s, tabela, { ordem });
    if (nome === 'reserve' || nome === 'transactions') lista.reverse();
    return lista.map((x) => ({ ...x, amount: x.amount != null ? Number(x.amount) : x.amount }));
  }
  exige(u, cfg.perm || 'edit');
  if (metodo === 'DELETE') {
    if (nome === 'people') {
      const { data: p } = await s.from('pessoas').select('user_id').eq('id', Number(id)).maybeSingle();
      if (p?.user_id) throw new Erro('Essa pessoa tem acesso: exclua o acesso em Acessos antes.');
    }
    const { error } = await s.from(tabela).delete().eq('id', Number(id));
    if (error) throw new Erro(error.message.includes('foreign key') ? 'Há outros registros ligados a este. Desative em vez de excluir.' : error.message);
    return ok();
  }
  const dados = limpar(cfg, body, !!id);
  if (nome === 'banks' && !id && !dados.slug) dados.slug = `${String(dados.label || dados.bank || 'banco').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now() % 10000}`;
  if (nome === 'purchases' && !id && !dados.date) dados.date = hoje();
  if (nome === 'bills' && dados.kind && !['casa', 'pessoal'].includes(dados.kind)) dados.kind = 'casa';
  if (nome === 'loanpay' && dados.kind === 'extra' && dados.covers == null) dados.covers = 1;
  let antes = null;
  if (id && (nome === 'incomes' || nome === 'assets')) ({ data: antes } = await s.from(tabela).select('*').eq('id', Number(id)).maybeSingle());
  const { data: reg, error } = id
    ? await s.from(tabela).update(dados).eq('id', Number(id)).select('*').maybeSingle()
    : await s.from(tabela).insert(dados).select('*').single();
  erroDb(error);
  if (!reg) throw new Erro('Não encontrado', 404);
  // reajuste de receita: guarda o valor antigo até o mês anterior
  if (nome === 'incomes' && antes && 'amount' in dados && Number(antes.amount) !== Number(dados.amount)) {
    const de = body.amount_from || somaMes(mesAtual(), 1);
    const { data: hist } = await s.from('receitas_valores').select('id').eq('income_id', reg.id).limit(1);
    if (!hist?.length) await s.from('receitas_valores').insert({ income_id: reg.id, from_month: antes.start_month || '2000-01', amount: Number(antes.amount) });
    await s.from('receitas_valores').delete().eq('income_id', reg.id).gte('from_month', de);
    await s.from('receitas_valores').insert({ income_id: reg.id, from_month: de, amount: Number(dados.amount) });
  }
  if (nome === 'assets' && reg.market_value && (!antes || Number(antes.market_value) !== Number(reg.market_value))) {
    await s.from('valores_bem').insert({ asset_id: reg.id, date: reg.value_date || hoje(), value: reg.market_value, source: 'cadastro' });
  }
  return reg;
}

// ---------- pagar / desfazer ----------
async function pagar(s, u, body) {
  const tipo = body.type; const id = Number(body.id);
  const ref = tipo === 'reminder' ? body.date : (body.month || mesAtual());
  if (!ref) throw new Erro('Informe a data');
  const { data: ex } = await s.from('pagamentos').select('*').eq('item_type', tipo).eq('item_id', id).eq('ref_month', ref).maybeSingle();
  if (!body.paid) {
    if (ex) {
      await s.from('pagamentos').delete().eq('id', ex.id);
      if (ex.lancamento_id) await s.from('lancamentos').delete().eq('id', ex.lancamento_id);
      if (ex.extra_tabela && ex.extra_id) await s.from(ex.extra_tabela).delete().eq('id', ex.extra_id);
    }
    if (tipo === 'saving') await s.from('movimentos_caixinha').delete().eq('savings_id', id).eq('ref_month', ref);
    return ok();
  }
  if (ex) {
    if (body.amount !== undefined && Number(body.amount) !== Number(ex.amount)) {
      await s.from('pagamentos').update({ amount: num(body.amount) }).eq('id', ex.id);
      if (ex.lancamento_id) await s.from('lancamentos').update({ amount: num(body.amount) }).eq('id', ex.lancamento_id);
      if (ex.extra_tabela === 'movimentos_caixinha') await s.from('movimentos_caixinha').update({ amount: num(body.amount) }).eq('id', ex.extra_id);
    }
    return ok();
  }
  const d = await carregar(s);
  const mesRef = ref.slice(0, 7);
  const item = itensAPagar(d, mesRef).find((i) => i.type === tipo && i.id === id && (tipo !== 'reminder' || i.date === ref));
  if (!item) throw new Erro('Item não encontrado neste mês');
  const valor = body.amount !== undefined && body.amount !== null && body.amount !== '' ? num(body.amount) : item.amount;
  const t = hoje();
  const data = tipo === 'reminder' ? ref : (mesRef === mesAtual() ? t : dataNoMes(mesRef, item.due_day));
  let lancamento_id = null; let extra_tabela = null; let extra_id = null;
  if (tipo === 'loan') {
    const e = d.emprestimos.find((x) => x.id === id);
    const no = difMeses((e.first_date || '').slice(0, 7), mesRef) + 1;
    const { data: pg, error } = await s.from('pagamentos_emprestimo').insert({ loan_id: id, date: data, amount: valor, installment_no: no, kind: 'parcela', covers: 1 }).select('id').single();
    erroDb(error); extra_tabela = 'pagamentos_emprestimo'; extra_id = pg.id;
  }
  if (tipo === 'saving' || (tipo === 'bill' && d.fixas.find((x) => x.id === id)?.is_reserve)) {
    const cx = tipo === 'saving' ? id : d.caixinhas.find((c) => c.active !== false)?.id;
    if (cx) {
      const { data: mv, error } = await s.from('movimentos_caixinha').insert({ savings_id: cx, date: data, amount: valor, note: tipo === 'saving' ? `Depósito de ${mesRef.split('-').reverse().join('/')}` : item.name, ref_month: tipo === 'saving' ? mesRef : null, bill_id: tipo === 'bill' ? id : null }).select('id').single();
      erroDb(error); extra_tabela = 'movimentos_caixinha'; extra_id = mv.id;
    }
  }
  if (item.account_id || tipo !== 'saving') {
    const kind = tipo === 'card' ? 'pagamento_fatura' : tipo === 'saving' ? 'caixinha' : 'pagamento';
    const cat = { card: 'Fatura', saving: 'Poupança', loan: 'Empréstimo', subscription: 'Assinaturas', reminder: d.recorrentes.find((x) => x.id === id)?.category || 'Contas' }[tipo] || 'Contas';
    const { data: l, error } = await s.from('lancamentos').insert({ date: data, amount: valor, type: 'saida', kind, account_id: item.account_id || null, person_id: item.owner_id || u.pessoa?.id || null, description: item.name, category: cat, asset_id: item.asset_id || null }).select('id').single();
    erroDb(error); lancamento_id = l.id;
  }
  erroDb((await s.from('pagamentos').insert({ item_type: tipo, item_id: id, ref_month: ref, amount: valor, date: data, account_id: item.account_id || null, lancamento_id, extra_tabela, extra_id })).error);
  return ok();
}

// ---------- receitas ----------
function visaoReceitas(d, m, pessoa) {
  const lista = d.receitas.filter((r) => !pessoa || r.owner_id === pessoa).map((r) => {
    const x = receitaNoMes(d, r, m);
    let next = null;
    for (let i = 0; i < 24 && !next; i++) { const mm = somaMes(m, i); const y = i ? receitaNoMes(d, r, mm) : x; if (y.remaining > 0 && y.due) next = y.due; }
    const { recs, ...mesInfo } = x;
    const hist = d.recValores.filter((v) => v.income_id === r.id).sort((a, b) => a.from_month.localeCompare(b.from_month)).map((v) => ({ amount: Number(v.amount), from_month: v.from_month }));
    return {
      ...r, amount: valorReceita(d, r, m), month: mesInfo, next_due: next, end_month_calc: x.end_month,
      history: hist, all_receipts: d.recebimentos.filter((y) => y.income_id === r.id).sort((a, b) => String(b.date).localeCompare(String(a.date))),
    };
  });
  const ativos = lista.filter((i) => i.month.dentro || i.month.received > 0);
  return { list: lista, expected: r2(ativos.reduce((s, i) => s + i.month.expected, 0)), received: r2(ativos.reduce((s, i) => s + i.month.received, 0)), remaining: r2(ativos.reduce((s, i) => s + i.month.remaining, 0)) };
}

// ---------- assinaturas ----------
function visaoAssinaturas(d, m) {
  const POR_ANO = { mensal: 12, trimestral: 4, semestral: 2, anual: 1 };
  const CICLO_TXT = { mensal: 'por mês', trimestral: 'a cada 3 meses', semestral: 'a cada 6 meses', anual: 'por ano' };
  const METODO = { cartao: 'Cartão', pix: 'Pix', debito: 'Débito', boleto: 'Boleto', dinheiro: 'Dinheiro' };
  const t = hoje();
  const lista = d.assinaturas.map((a) => {
    const live = a.active !== false && (!a.end_month || a.end_month >= m);
    let next = null;
    for (let i = 0; i < 13 && live && !next; i++) {
      const mm = somaMes(t.slice(0, 7), i);
      if (assinaturaCobra(a, mm)) { const dt = dataNoMes(mm, a.day || 1); if (dt >= t) next = dt; }
    }
    const card = d.cartoes.find((c) => c.id === a.card_id);
    const perMonth = r2((Number(a.amount) || 0) * (POR_ANO[a.cycle || 'mensal'] || 12) / 12);
    return { ...a, amount: Number(a.amount), live, next, per_month: perMonth, cycle_txt: CICLO_TXT[a.cycle || 'mensal'] || a.cycle, paid_with: (a.method || 'cartao') === 'cartao' ? (card ? `Cartão ${card.name}` : 'Cartão') : METODO[a.method] || a.method };
  });
  const vivas = lista.filter((a) => a.live);
  const agrupa = (k) => Object.entries(vivas.reduce((acc, a) => { const c = a[k] || 'outros'; acc[c] = r2((acc[c] || 0) + a.per_month); return acc; }, {})).sort((x, y) => y[1] - x[1]);
  const proximas = vivas.filter((a) => a.next).sort((a, b) => a.next.localeCompare(b.next));
  return {
    list: lista, active: vivas.length, per_month: r2(vivas.reduce((s, a) => s + a.per_month, 0)), per_year: r2(vivas.reduce((s, a) => s + a.per_month * 12, 0)),
    next: proximas[0] || null, by_category: agrupa('category'), by_method: agrupa('method'),
  };
}

// ---------- bens ----------
function detalheBem(d, b) {
  const info = bemInfo(d, b);
  const t = hoje(); const desde = `${somaMes(t.slice(0, 7), -11)}-01`;
  const entries = d.lancamentos.filter((l) => l.asset_id === b.id && l.type === 'saida').map((l) => ({ date: l.date, desc: l.description || '', category: l.category || 'Outros', amount: Number(l.amount) }));
  const loanIds = d.emprestimos.filter((e) => e.asset_id === b.id).map((e) => e.id);
  for (const p of d.pagEmp.filter((x) => loanIds.includes(x.loan_id))) {
    if (!d.pagamentos.some((g) => g.extra_tabela === 'pagamentos_emprestimo' && g.extra_id === p.id)) entries.push({ date: p.date, desc: 'Parcela do financiamento', category: 'Parcelas', amount: Number(p.amount) });
  }
  entries.sort((a, b2) => b2.date.localeCompare(a.date));
  const porCat = {};
  for (const e of entries.filter((x) => x.date >= desde)) porCat[e.category] = r2((porCat[e.category] || 0) + e.amount);
  const hist = d.valoresBem.filter((v) => v.asset_id === b.id).sort((a, b2) => a.date.localeCompare(b2.date)).map((v) => ({ date: v.date, value: Number(v.value), source: v.source }));
  if (b.purchase_price && b.purchase_date && !hist.some((h) => h.date === b.purchase_date)) hist.unshift({ date: b.purchase_date, value: Number(b.purchase_price), source: 'compra' });
  return {
    ...info, paid: r2(entries.reduce((s, e) => s + e.amount, 0) + (Number(b.paid_before) || 0)),
    per_month: r2(entries.filter((x) => x.date >= desde).reduce((s, e) => s + e.amount, 0) / 12),
    by_category: porCat, entries, history: hist,
  };
}
async function valorBem(s, body) {
  const { data: b } = await s.from('bens').select('*').eq('id', Number(body.id)).maybeSingle();
  if (!b) throw new Erro('Bem não encontrado');
  let valor = num(body.value); let fonte = body.source || 'avaliação';
  if (body.fipe) {
    if (!b.fipe_code || !b.fipe_year) throw new Erro('Este bem ainda não tem o código FIPE');
    const r = await fetch(`https://fipe.parallelum.com.br/api/v2/${b.fipe_type || 'cars'}/${encodeURIComponent(b.fipe_code)}/years/${encodeURIComponent(b.fipe_year)}`);
    if (!r.ok) throw new Erro('Não consegui consultar a FIPE agora');
    const j = await r.json();
    valor = Number(String(j.price).replace(/[^\d,]/g, '').replace(',', '.'));
    fonte = `FIPE ${j.referenceMonth || ''}`.trim();
  }
  if (!(valor > 0)) throw new Erro('Informe o valor');
  const data = body.date || hoje();
  await s.from('valores_bem').insert({ asset_id: b.id, date: data, value: valor, source: fonte });
  await s.from('bens').update({ market_value: valor, value_date: data }).eq('id', b.id);
  return { value: valor };
}
async function fipe(partes) {
  // brands, brands/:id/models, brands/:id/models/:id/years, .../years/:id
  const [tipo, ...resto] = partes;
  if (!['cars', 'motorcycles', 'trucks'].includes(tipo)) throw new Erro('Tipo FIPE inválido');
  const r = await fetch(`https://fipe.parallelum.com.br/api/v2/${tipo}/${resto.map(encodeURIComponent).join('/')}`);
  if (!r.ok) throw new Erro('A FIPE não respondeu agora');
  return r.json();
}

// ---------- avisos (sininho) ----------
const PREFS = { contas: true, dias_antes: 1, hora: '09:00', lembretes: true, limite: true, limite_pct: 80, saldo: true, saldo_minimo: 0, receitas: true, salario: true, resumo: false, resumo_hora: '20:00', push: false };
const prefsDe = (m) => ({ ...PREFS, ...(m.avisos || {}) });
async function gerarAvisos(s, u) {
  const p = prefsDe(u.m);
  const d = await carregar(s);
  const t = hoje(); const m = t.slice(0, 7);
  const r = resumo(d, m, u.pessoa?.id, u.auth.id);
  const novos = [];
  if (p.contas) {
    for (const i of r.to_pay.items.filter((x) => !x.paid)) {
      const dt = i.date || dataNoMes(m, i.due_day); const falta = difDias(t, dt);
      if (falta <= (Number(p.dias_antes) || 0)) novos.push({ kind: i.type === 'reminder' ? 'lembrete' : 'conta', tag: `pagar-${i.type}-${i.id}-${dt}`, title: falta < 0 ? `${i.name} venceu` : falta === 0 ? `${i.name} vence hoje` : `${i.name} vence em ${falta} dia(s)`, body: `R$ ${i.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, url: '/app#visao', action: { type: i.type, id: i.id, month: m, date: i.date || undefined } });
    }
  }
  if (p.saldo) for (const a of r.accounts.alerts) novos.push({ kind: 'saldo', tag: `saldo-${a.id}-${a.date}`, title: `${a.name} pode ficar negativa`, body: `Fica em R$ ${a.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} dia ${a.date.slice(8)}. Deposite antes dos débitos.`, url: '/app#bancarias' });
  if (p.limite) for (const c of r.credit.cards) if (c.limit && (c.used / c.limit) * 100 >= (Number(p.limite_pct) || 80)) novos.push({ kind: 'limite', tag: `limite-${c.id}-${m}`, title: `Limite do ${c.name} acabando`, body: `Livre: R$ ${c.free.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, url: '/app#cartoes' });
  if (!novos.length) return 0;
  const { data: ja } = await s.from('notificacoes').select('tag').in('tag', novos.map((x) => x.tag));
  const tem = new Set((ja || []).map((x) => x.tag));
  const inserir = novos.filter((x) => !tem.has(x.tag)).map((x) => ({ ...x, user_id: u.auth.id }));
  if (inserir.length) await s.from('notificacoes').insert(inserir);
  return inserir.length;
}

// ---------- ajuda ----------
const FAQ = [
  { id: 'senha', cat: 'Acesso', q: 'Esqueci a senha. E agora?', a: ['Peça para o administrador (Diego) abrir Acessos, tocar no seu nome e definir uma senha nova.', 'Depois de entrar, troque a senha em Meu perfil.'], link: '#perfil' },
  { id: 'acesso', cat: 'Acesso', q: 'Como dou acesso para outra pessoa da casa?', a: ['Em Configurações → Acessos, toque em “+ Novo acesso”.', 'Escolha “Dados principais” para ela ver os mesmos dados.', 'Passe o login e a senha inicial para ela.'], link: '#acessos' },
  { id: 'pagar', cat: 'Uso', q: 'Como marco uma conta como paga?', a: ['Na Visão geral, em Contas a pagar, toque no círculo ao lado da conta.', 'Para pagar outro valor ou pular só este mês, toque no nome da conta.'], link: '#visao' },
  { id: 'cartao', cat: 'Uso', q: 'Como lanço uma compra parcelada no cartão?', a: ['Toque em “+ Adicionar” → Compra no cartão.', 'Informe o valor total, o número de parcelas e a primeira fatura.'], link: '#cartoes' },
  { id: 'receber', cat: 'Uso', q: 'Como registro um salário ou contrato que caiu?', a: ['Cadastre a receita em Receitas e contratos.', 'Quando cair, toque em “Recebi”: a entrada vai para a conta escolhida.'], link: '#receitas' },
  { id: 'nuvem', cat: 'Versão da nuvem', q: 'O que muda na versão da nuvem?', a: ['O app roda na internet (Vercel) com o banco no Supabase: funciona fora de casa.', 'Ainda não estão ligados: bancos conectados (Open Finance), notificações no celular e Conectar IA.', 'O backup do banco é feito pelo Supabase; você também pode exportar os dados em Backup.'] },
];
function ajuda(qs) {
  if (!qs) return { faq: FAQ };
  const pal = String(qs).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/\W+/).filter((x) => x.length > 2);
  const nota = (f) => pal.filter((p) => `${f.q} ${f.a.join(' ')}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(p)).length;
  return { faq: FAQ, results: FAQ.map((f) => [f, nota(f)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map((x) => x[0]) };
}

// ---------- acessos ----------
async function acessos(s, u, metodo, id, extra, body) {
  exige(u, 'manage_users');
  if (metodo === 'GET') {
    const [{ data: ms }, { data: ps }] = await Promise.all([s.from('membros').select('*').eq('token', false).order('id'), s.from('pessoas').select('id,name,user_id')]);
    return (ms || []).map((m) => {
      const p = (ps || []).find((x) => x.user_id === m.user_id);
      return {
        id: m.id, name: m.nome || m.login, login: m.login, photo: m.foto, email: m.email_contato, phone: m.telefone, role: m.nivel,
        role_label: NIVEIS[m.nivel]?.label || m.nivel, active: m.ativo, pending: false, person_id: p?.id ?? null, person_name: p?.name ?? null,
        space_id: null, invited_by_name: m.criado_por ? (ms.find((x) => x.user_id === m.criado_por)?.nome || null) : null, totp_enabled: false, created_at: m.criado_em,
      };
    });
  }
  if (metodo === 'POST' && !id) {
    const { data, error } = await s.rpc('criar_acesso', { p_login: body.login, p_senha: body.password, p_nome: body.name, p_nivel: body.role || 'parceiro', p_pessoa: body.person_id || null, p_espaco: body.space || 'own', p_email: body.email || '', p_telefone: body.phone || '' });
    erroDb(error); return { id: data };
  }
  if (metodo === 'PUT') {
    const { error } = await s.rpc('alterar_acesso', { p_id: Number(id), p_nome: body.name, p_login: body.login, p_nivel: body.role, p_senha: body.password || '', p_ativo: body.active !== false, p_pessoa: body.person_id || null, p_email: body.email || '', p_telefone: body.phone || '' });
    erroDb(error); return ok();
  }
  if (metodo === 'DELETE') { const { error } = await s.rpc('excluir_acesso', { p_id: Number(id) }); erroDb(error); return ok(); }
  if (extra === '2fa-reset') return ok();
  throw new Erro('Rota desconhecida', 404);
}

// ---------- exportar / zerar ----------
const TABELAS = ['pessoas', 'bancos', 'bens', 'valores_bem', 'contas_bancarias', 'cartoes', 'contas_fixas', 'compras_cartao', 'caixinhas',
  'movimentos_caixinha', 'emprestimos', 'pagamentos_emprestimo', 'movimentos_conta', 'recorrentes', 'assinaturas', 'receitas',
  'receitas_valores', 'lancamentos', 'recebimentos', 'produtos_despensa', 'movimentos_despensa', 'projetos', 'pagamentos',
  'ajustes_ocorrencia', 'acertos'];
async function exportar(s) {
  const out = { app: 'casa-em-dia-nuvem', exportado_em: new Date().toISOString() };
  const { data: aj } = await s.from('ajustes').select('*'); out.ajustes = aj;
  for (const t of TABELAS) out[t] = await tudo(s, t);
  return { __download: `casa-em-dia-${hoje()}.json`, conteudo: out };
}
async function zerar(s, u, body) {
  if (body.confirm !== 'APAGAR') throw new Erro('Confirme digitando APAGAR');
  for (const t of ['pagamentos', 'ajustes_ocorrencia', 'acertos', 'recebimentos', 'movimentos_despensa', 'produtos_despensa', 'lancamentos', 'receitas_valores', 'receitas',
    'assinaturas', 'recorrentes', 'movimentos_conta', 'pagamentos_emprestimo', 'emprestimos', 'movimentos_caixinha', 'caixinhas', 'compras_cartao',
    'contas_fixas', 'cartoes', 'contas_bancarias', 'valores_bem', 'projetos', 'bens', 'notificacoes']) {
    erroDb((await s.from(t).delete().gte('id', 0)).error);
  }
  await s.from('pessoas').update({ salary: 0 }).gte('id', 0);
  return ok();
}
async function importar() {
  throw new Erro('A importação ainda não está ligada. Mande o arquivo para o Claude que ele importa para você.');
}
