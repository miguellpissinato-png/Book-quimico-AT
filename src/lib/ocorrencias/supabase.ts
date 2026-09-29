import type { Ocorrencia } from './modelo';

/**
 * Envio dos registros para um banco compartilhado (Supabase, plano gratuito),
 * usando a API REST direto — sem bibliotecas extras.
 * Configuração: variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja o README).
 */
const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '');
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const nuvemConfigurada = Boolean(URL_BASE && CHAVE);

type Linha = {
  id: string;
  criado_em: string;
  atualizado_em: string;
  status: Ocorrencia['status'];
  produtos: Ocorrencia['produtos'];
  acoes: Ocorrencia['acoes'];
  responsavel: string;
  local: string;
  area: string;
  exposicao: string[];
  pessoa_atendida: string;
  descricao: string;
  encaminhamento: string;
  dispositivo: string;
};

function paraLinha(o: Ocorrencia): Linha {
  return {
    id: o.id,
    criado_em: o.criadoEm,
    atualizado_em: o.atualizadoEm,
    status: o.status,
    produtos: o.produtos,
    acoes: o.acoes,
    responsavel: o.responsavel,
    local: o.local,
    area: o.area,
    exposicao: o.exposicao,
    pessoa_atendida: o.pessoaAtendida,
    descricao: o.descricao,
    encaminhamento: o.encaminhamento,
    dispositivo: o.dispositivo,
  };
}

function deLinha(l: Linha): Ocorrencia {
  return {
    id: l.id,
    criadoEm: new Date(l.criado_em).toISOString(),
    atualizadoEm: new Date(l.atualizado_em).toISOString(),
    status: l.status,
    produtos: l.produtos || [],
    acoes: l.acoes || [],
    responsavel: l.responsavel || '',
    local: l.local || '',
    area: (l.area || '') as Ocorrencia['area'],
    exposicao: (l.exposicao || []) as Ocorrencia['exposicao'],
    pessoaAtendida: l.pessoa_atendida || '',
    descricao: l.descricao || '',
    encaminhamento: l.encaminhamento || '',
    dispositivo: l.dispositivo || '',
  };
}

function cabecalhos(extra: Record<string, string> = {}): HeadersInit {
  return { apikey: CHAVE!, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json', ...extra };
}

async function verificar(resp: Response) {
  if (!resp.ok) throw new Error(`Servidor respondeu ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
}

/** Cria ou atualiza (upsert) os registros pelo id. */
export async function enviar(lista: Ocorrencia[]): Promise<void> {
  if (!nuvemConfigurada || lista.length === 0) return;
  const resp = await fetch(`${URL_BASE}/rest/v1/ocorrencias?on_conflict=id`, {
    method: 'POST',
    headers: cabecalhos({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(lista.map(paraLinha)),
  });
  await verificar(resp);
}

export async function baixar(limite = 500): Promise<Ocorrencia[]> {
  if (!nuvemConfigurada) return [];
  const resp = await fetch(`${URL_BASE}/rest/v1/ocorrencias?select=*&order=criado_em.desc&limit=${limite}`, {
    headers: cabecalhos(),
  });
  await verificar(resp);
  return ((await resp.json()) as Linha[]).map(deLinha);
}
