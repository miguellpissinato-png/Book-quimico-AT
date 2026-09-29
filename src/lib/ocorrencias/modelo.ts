/** Área onde a ocorrência aconteceu (campo do registro). */
export type Area = 'assistencia' | 'engenharia';

export const AREAS: Record<Area, string> = {
  assistencia: 'Assistência Técnica',
  engenharia: 'Engenharia',
};

export type TipoAcao =
  | 'produto_consultado'
  | 'ligou_samu'
  | 'ligou_intoxicacao'
  | 'ligou_fabricante'
  | 'abriu_pdf'
  | 'baixou_pdf'
  | 'compartilhou_pdf'
  | 'registro_manual';

export const ROTULO_ACAO: Record<TipoAcao, string> = {
  produto_consultado: 'Ficha consultada',
  ligou_samu: 'Ligação para o SAMU (192)',
  ligou_intoxicacao: 'Ligação para o Disque-Intoxicação',
  ligou_fabricante: 'Ligação para o fabricante',
  abriu_pdf: 'Ficha completa (PDF) aberta',
  baixou_pdf: 'PDF baixado no celular',
  compartilhou_pdf: 'Ficha enviada',
  registro_manual: 'Registro criado manualmente',
};

export type Acao = {
  tipo: TipoAcao;
  /** Data/hora ISO. */
  em: string;
  produtoId?: string;
  produtoNome?: string;
};

export type Exposicao = 'inalacao' | 'pele' | 'olhos' | 'ingestao';

export const ROTULO_EXPOSICAO: Record<Exposicao, string> = {
  inalacao: 'Inalação',
  pele: 'Pele',
  olhos: 'Olhos',
  ingestao: 'Ingestão',
};

export type StatusOcorrencia = 'aberta' | 'concluida' | 'descartada';

export const ROTULO_STATUS: Record<StatusOcorrencia, string> = {
  aberta: 'Aguardando detalhes',
  concluida: 'Concluída',
  descartada: 'Descartada',
};

export type Ocorrencia = {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  status: StatusOcorrencia;
  produtos: { id: string; nome: string }[];
  acoes: Acao[];
  responsavel: string;
  local: string;
  area: Area | 'outra' | '';
  exposicao: Exposicao[];
  pessoaAtendida: string;
  descricao: string;
  encaminhamento: string;
  dispositivo: string;
};

export type CamposEditaveis = Pick<
  Ocorrencia,
  'responsavel' | 'local' | 'area' | 'exposicao' | 'pessoaAtendida' | 'descricao' | 'encaminhamento' | 'status'
>;

export function novaOcorrencia(id: string, agora: string, dispositivo = ''): Ocorrencia {
  return {
    id,
    criadoEm: agora,
    atualizadoEm: agora,
    status: 'aberta',
    produtos: [],
    acoes: [],
    responsavel: '',
    local: '',
    area: '',
    exposicao: [],
    pessoaAtendida: '',
    descricao: '',
    encaminhamento: '',
    dispositivo,
  };
}

/** Acrescenta uma ação (e o produto, se for novo) sem alterar o objeto original. */
export function comAcao(o: Ocorrencia, acao: Acao): Ocorrencia {
  const produtos =
    acao.produtoId && !o.produtos.some((p) => p.id === acao.produtoId)
      ? [...o.produtos, { id: acao.produtoId, nome: acao.produtoNome || acao.produtoId }]
      : o.produtos;
  return { ...o, produtos, acoes: [...o.acoes, acao], atualizadoEm: acao.em };
}

/**
 * Junta a lista do servidor com a lista local.
 * - Registros com alterações ainda não enviadas (pendentes) sempre ficam na versão local.
 * - Nos demais, vence a versão alterada por último.
 */
export function mesclar(locais: Ocorrencia[], remotos: Ocorrencia[], pendentes: Set<string>): Ocorrencia[] {
  const mapa = new Map<string, Ocorrencia>();
  for (const r of remotos) mapa.set(r.id, r);
  for (const l of locais) {
    const r = mapa.get(l.id);
    if (!r || pendentes.has(l.id) || l.atualizadoEm > r.atualizadoEm) mapa.set(l.id, l);
  }
  return ordenar([...mapa.values()]);
}

export function ordenar(lista: Ocorrencia[]): Ocorrencia[] {
  return [...lista].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0));
}

export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatarHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Planilha CSV (separador ";" e BOM, para abrir certo no Excel em português). */
export function gerarCsv(lista: Ocorrencia[]): string {
  const colunas = [
    'Data/hora',
    'Situação',
    'Produto(s)',
    'Responsável',
    'Local',
    'Área',
    'Exposição',
    'Pessoa atendida',
    'Descrição',
    'Encaminhamento',
    'Ações registradas',
  ];
  const areaRotulo = (a: Ocorrencia['area']) =>
    a === 'assistencia' ? 'Assistência Técnica' : a === 'engenharia' ? 'Engenharia' : a === 'outra' ? 'Outra' : '';
  const linhas = lista.map((o) => [
    formatarDataHora(o.criadoEm),
    ROTULO_STATUS[o.status],
    o.produtos.map((p) => p.nome).join(', '),
    o.responsavel,
    o.local,
    areaRotulo(o.area),
    o.exposicao.map((e) => ROTULO_EXPOSICAO[e]).join(', '),
    o.pessoaAtendida,
    o.descricao,
    o.encaminhamento,
    o.acoes.map((a) => `${formatarHora(a.em)} ${ROTULO_ACAO[a.tipo]}${a.produtoNome ? ` (${a.produtoNome})` : ''}`).join(' | '),
  ]);
  const celula = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return '﻿' + [colunas, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n');
}
