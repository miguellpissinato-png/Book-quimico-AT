import { useSyncExternalStore } from 'react';
import type { Produto } from '../../data/produtos';
import {
  comAcao,
  mesclar,
  novaOcorrencia,
  ordenar,
  type CamposEditaveis,
  type Ocorrencia,
  type TipoAcao,
} from './modelo';
import * as nuvem from './supabase';

/**
 * Registro de ocorrências.
 *
 * Tudo é salvo PRIMEIRO no celular (funciona sem internet e não atrasa ninguém numa
 * emergência). Se o banco compartilhado estiver configurado, os registros são enviados
 * em segundo plano e reenviados automaticamente quando a internet voltar.
 *
 * Numa emergência a pessoa não precisa preencher nada: ao escolher o produto na tela
 * de emergência ou ligar para o SAMU/Disque-Intoxicação, uma ocorrência é aberta
 * sozinha e cada ação fica registrada com horário. Os detalhes são completados depois,
 * na aba "Registros".
 */

const CHAVE = 'bookquimico:ocorrencias:v1';
const CHAVE_ATIVA = 'bookquimico:ocorrencia-ativa:v1';
/** Ações dentro desta janela entram na mesma ocorrência. */
const JANELA_ATIVA_MS = 2 * 60 * 60 * 1000;

type Salvo = { itens: Ocorrencia[]; pendentes: string[] };

export type EstadoSync = {
  modo: 'local' | 'nuvem';
  sincronizando: boolean;
  pendentes: number;
  erro?: string;
  ultimaSync?: string;
};

type Estado = { itens: Ocorrencia[]; sync: EstadoSync };

function lerLocal(): Salvo {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const s = JSON.parse(bruto) as Salvo;
      if (Array.isArray(s.itens)) return { itens: s.itens, pendentes: s.pendentes || [] };
    }
  } catch {
    /* armazenamento indisponível (aba anônima etc.) */
  }
  return { itens: [], pendentes: [] };
}

const inicial = lerLocal();
let pendentes = new Set(inicial.pendentes);
let estado: Estado = {
  itens: ordenar(inicial.itens),
  sync: { modo: nuvem.nuvemConfigurada ? 'nuvem' : 'local', sincronizando: false, pendentes: pendentes.size },
};
const ouvintes = new Set<() => void>();

function publicar(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial, sync: { ...estado.sync, ...parcial.sync, pendentes: pendentes.size } };
  ouvintes.forEach((f) => f());
}

function persistir() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ itens: estado.itens, pendentes: [...pendentes] } satisfies Salvo));
  } catch {
    /* sem espaço ou bloqueado: o registro continua na memória até fechar o app */
  }
}

function gravar(o: Ocorrencia) {
  const itens = ordenar([o, ...estado.itens.filter((x) => x.id !== o.id)]);
  if (nuvem.nuvemConfigurada) pendentes.add(o.id);
  publicar({ itens });
  persistir();
  agendarSync();
}

function gerarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Alternativa para navegadores antigos / sem HTTPS.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function descreverDispositivo(): string {
  const ua = navigator.userAgent;
  const so = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Outro';
  return `${so} · ${window.screen.width}×${window.screen.height}`;
}

function lerAtiva(): string | undefined {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_ATIVA) || 'null') as { id: string; em: number } | null;
    if (!s || Date.now() - s.em > JANELA_ATIVA_MS) return undefined;
    const o = estado.itens.find((x) => x.id === s.id);
    return o && o.status === 'aberta' ? o.id : undefined;
  } catch {
    return undefined;
  }
}

function marcarAtiva(id: string) {
  try {
    localStorage.setItem(CHAVE_ATIVA, JSON.stringify({ id, em: Date.now() }));
  } catch {
    /* ignora */
  }
}

// ---------- API usada pelas telas ----------

export function ocorrenciaAtiva(): Ocorrencia | undefined {
  const id = lerAtiva();
  return id ? estado.itens.find((x) => x.id === id) : undefined;
}

/**
 * Registra uma ação da emergência. Usa a ocorrência aberta nas últimas 2 horas
 * ou cria uma nova. Retorna o id da ocorrência.
 */
export function registrarAcao(tipo: TipoAcao, produto?: Pick<Produto, 'id' | 'nome'>): string {
  const agora = new Date().toISOString();
  const atual = ocorrenciaAtiva() ?? novaOcorrencia(gerarId(), agora, descreverDispositivo());
  const atualizada = comAcao(atual, { tipo, em: agora, produtoId: produto?.id, produtoNome: produto?.nome });
  gravar(atualizada);
  marcarAtiva(atualizada.id);
  return atualizada.id;
}

/** Registra a ação só se já existe uma emergência em andamento (ex.: baixar PDF). */
export function registrarSeEmAndamento(tipo: TipoAcao, produto?: Pick<Produto, 'id' | 'nome'>) {
  if (ocorrenciaAtiva()) registrarAcao(tipo, produto);
}

export function criarManual(): string {
  const agora = new Date().toISOString();
  const o = comAcao(novaOcorrencia(gerarId(), agora, descreverDispositivo()), { tipo: 'registro_manual', em: agora });
  gravar(o);
  return o.id;
}

export function atualizar(id: string, campos: Partial<CamposEditaveis>) {
  const o = estado.itens.find((x) => x.id === id);
  if (!o) return;
  gravar({ ...o, ...campos, atualizadoEm: new Date().toISOString() });
}

export function obter(id: string): Ocorrencia | undefined {
  return estado.itens.find((x) => x.id === id);
}

// ---------- Sincronização ----------

let timerSync: ReturnType<typeof setTimeout> | undefined;
let emAndamento: Promise<void> | undefined;

function agendarSync(atraso = 800) {
  if (!nuvem.nuvemConfigurada) return;
  clearTimeout(timerSync);
  timerSync = setTimeout(() => void sincronizar(), atraso);
}

export function sincronizar(): Promise<void> {
  if (!nuvem.nuvemConfigurada) return Promise.resolve();
  if (emAndamento) return emAndamento;
  emAndamento = (async () => {
    publicar({ sync: { ...estado.sync, sincronizando: true } });
    try {
      const enviando = estado.itens.filter((o) => pendentes.has(o.id));
      await nuvem.enviar(enviando);
      // Só remove dos pendentes se não mudou de novo enquanto enviava.
      for (const o of enviando) {
        if (estado.itens.find((x) => x.id === o.id)?.atualizadoEm === o.atualizadoEm) pendentes.delete(o.id);
      }
      const remotos = await nuvem.baixar();
      publicar({
        itens: mesclar(estado.itens, remotos, pendentes),
        sync: { ...estado.sync, sincronizando: false, erro: undefined, ultimaSync: new Date().toISOString() },
      });
    } catch (e) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      publicar({
        sync: {
          ...estado.sync,
          sincronizando: false,
          erro: offline ? 'Sem internet — os registros serão enviados quando a conexão voltar.' : String((e as Error).message || e),
        },
      });
    } finally {
      persistir();
      emAndamento = undefined;
      if (pendentes.size > 0 && navigator.onLine) agendarSync(30_000);
    }
  })();
  return emAndamento;
}

if (nuvem.nuvemConfigurada && typeof window !== 'undefined') {
  window.addEventListener('online', () => agendarSync(300));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') agendarSync(300);
  });
  agendarSync(1500);
}

// Outra aba do mesmo navegador alterou os registros.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CHAVE) return;
    const s = lerLocal();
    pendentes = new Set(s.pendentes);
    publicar({ itens: ordenar(s.itens) });
  });
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function useOcorrencias(): Estado {
  return useSyncExternalStore(assinar, () => estado);
}
