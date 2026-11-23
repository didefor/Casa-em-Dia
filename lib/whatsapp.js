// WhatsApp: o agente (OpenClaw) age pelo dono do número que mandou a mensagem.
import { createCipheriv, createDecipheriv, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const anon = () => createClient(URL_SB, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

// número só com dígitos, com o 55 do Brasil
export function normTel(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
}
export const mascara = (t) => (t ? `+${t.slice(0, 2)} ${t.slice(2, 4)} ${'•'.repeat(Math.max(0, t.length - 8))}${t.slice(-4)}` : '');
export const novoCodigo = () => String(randomInt(0, 1e6)).padStart(6, '0');

// a chave de IA do número fica cifrada no banco; a chave mestra existe só na Vercel
const mestra = () => {
  const k = Buffer.from(process.env.WHATSAPP_CHAVE_MESTRA || '', 'base64');
  if (k.length !== 32) throw new Error('WhatsApp ainda não configurado no servidor');
  return k;
};
export function cifrar(texto) {
  const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', mestra(), iv);
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString('base64url')).join('.');
}
export function decifrar(pacote) {
  const [iv, tag, dados] = String(pacote).split('.').map((x) => Buffer.from(x, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', mestra(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString('utf8');
}
export function agenteOk(segredo) {
  const certo = Buffer.from(process.env.WHATSAPP_AGENT_KEY || '');
  const veio = Buffer.from(String(segredo || ''));
  return certo.length > 20 && certo.length === veio.length && timingSafeEqual(certo, veio);
}
