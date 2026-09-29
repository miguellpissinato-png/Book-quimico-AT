import dados from './produtos.json';

export type Area = 'assistencia' | 'engenharia';

export const AREAS: Record<Area, string> = {
  assistencia: 'Assistência Técnica',
  engenharia: 'Engenharia',
};

export type PrimeirosSocorros = {
  inalacao?: string;
  pele?: string;
  olhos?: string;
  ingestao?: string;
  /** Seção 4 da FDS — "Notas para o médico" (opcional). */
  notasMedico?: string;
};

export type Produto = {
  /** Identificador único, sem espaços nem acentos. Ex.: "alcool-isopropilico". */
  id: string;
  nome: string;
  /** Outros nomes pelos quais o produto é procurado (marca, sigla, apelido). */
  sinonimos?: string[];
  fabricante?: string;
  /** Data de revisão da FDS, no formato AAAA-MM-DD. */
  revisao?: string;
  areas: Area[];
  /** Caminho do PDF dentro de public/. Ex.: "fichas/pdf/alcool-isopropilico.pdf". */
  pdf?: string;
  /** Foto da embalagem dentro de public/. Ex.: "fichas/fotos/alcool-isopropilico.jpg". */
  foto?: string;
  /** Telefone de emergência do fabricante (seção 1 da FDS). */
  telefoneEmergencia?: string;
  /** Para que o produto é usado no dia a dia. */
  uso?: string;
  /** Perigos principais (seção 2 da FDS). Ex.: ["Líquido inflamável", "Irritante aos olhos"]. */
  perigos?: string[];
  primeirosSocorros?: PrimeirosSocorros;
  /** Composição (seção 3 da FDS): principais componentes e nº CAS. */
  composicao?: string;
  /** Aparece primeiro na tela de emergência (produtos mais usados). */
  destaque?: boolean;
  /** Marca a ficha como dado de exemplo: o app exibe um aviso amarelo. */
  exemplo?: boolean;
};

export const PRODUTOS: Produto[] = dados as Produto[];

export function buscarProduto(id: string | undefined): Produto | undefined {
  return PRODUTOS.find((p) => p.id === id);
}

/** Remove acentos e deixa minúsculo, para a busca achar "alcool" em "Álcool". */
export function semAcento(texto: string | undefined): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Filtra por texto (nome, sinônimos, fabricante) e área. Todas as palavras precisam aparecer. */
export function filtrarProdutos(lista: Produto[], termo: string, area: Area | 'todas' = 'todas'): Produto[] {
  const palavras = semAcento(termo).split(/\s+/).filter(Boolean);
  return lista.filter((p) => {
    if (area !== 'todas' && !p.areas.includes(area)) return false;
    if (palavras.length === 0) return true;
    const alvo = semAcento([p.nome, p.fabricante, ...(p.sinonimos || [])].join(' '));
    return palavras.every((w) => alvo.includes(w));
  });
}

export function ordemAlfabetica(a: Produto, b: Produto): number {
  return a.nome.localeCompare(b.nome, 'pt-BR');
}

/** Destaques primeiro, depois ordem alfabética (usado na tela de emergência). */
export function ordemEmergencia(a: Produto, b: Produto): number {
  if (!!a.destaque !== !!b.destaque) return a.destaque ? -1 : 1;
  return ordemAlfabetica(a, b);
}

export function formatarRevisao(revisao: string | undefined): string | undefined {
  if (!revisao) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(revisao);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : revisao;
}

/** URL completa de um arquivo em public/, respeitando o caminho de publicação. */
export function urlPublica(caminho: string): string {
  return import.meta.env.BASE_URL + caminho.replace(/^\/+/, '');
}
