import { useSyncExternalStore } from 'react';

/**
 * Navegação por "#/caminho". Funciona em qualquer hospedagem estática (GitHub Pages,
 * Netlify...) e faz o botão/gesto "voltar" do celular voltar uma tela dentro do app,
 * em vez de fechar o navegador.
 */
export type Rota =
  | { tela: 'inicio' }
  | { tela: 'emergencia' }
  | { tela: 'documentos' }
  | { tela: 'produto'; id: string; origem: 'emergencia' | 'documentos' }
  | { tela: 'registros' }
  | { tela: 'registro'; id: string };

export function lerRota(hash: string): Rota {
  const [caminho, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const partes = caminho.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  switch (partes[0]) {
    case 'emergencia':
      return { tela: 'emergencia' };
    case 'documentos':
      return { tela: 'documentos' };
    case 'produto':
      if (partes[1]) {
        return { tela: 'produto', id: partes[1], origem: params.get('de') === 'emergencia' ? 'emergencia' : 'documentos' };
      }
      return { tela: 'documentos' };
    case 'registros':
      return partes[1] ? { tela: 'registro', id: partes[1] } : { tela: 'registros' };
    default:
      return { tela: 'inicio' };
  }
}

export function caminhoDe(rota: Rota): string {
  switch (rota.tela) {
    case 'inicio':
      return '#/';
    case 'produto':
      return `#/produto/${encodeURIComponent(rota.id)}${rota.origem === 'emergencia' ? '?de=emergencia' : ''}`;
    case 'registro':
      return `#/registros/${encodeURIComponent(rota.id)}`;
    default:
      return `#/${rota.tela}`;
  }
}

/** Tela "pai" usada pelo botão Voltar quando a pessoa abriu o link direto. */
function telaPai(rota: Rota): Rota {
  switch (rota.tela) {
    case 'produto':
      return { tela: rota.origem };
    case 'registro':
      return { tela: 'registros' };
    default:
      return { tela: 'inicio' };
  }
}

const ouvintes = new Set<() => void>();
let hashAtual = window.location.hash;
let rotaAtual = lerRota(hashAtual);
let ultimoIndice = 0;

function atualizar() {
  // Links comuns (<a href="#/...">) criam uma entrada no histórico sem índice: numeramos aqui.
  if (typeof (window.history.state as { idx?: number } | null)?.idx !== 'number') {
    window.history.replaceState({ idx: ultimoIndice + 1 }, '');
  }
  ultimoIndice = indiceAtual();
  if (window.location.hash === hashAtual) return;
  hashAtual = window.location.hash;
  rotaAtual = lerRota(hashAtual);
  ouvintes.forEach((f) => f());
}
window.addEventListener('hashchange', atualizar);
window.addEventListener('popstate', atualizar);

/** Índice da tela na pilha de navegação do app (0 = primeira tela aberta). */
function indiceAtual(): number {
  const st = window.history.state as { idx?: number } | null;
  return typeof st?.idx === 'number' ? st.idx : 0;
}
if (typeof (window.history.state as { idx?: number } | null)?.idx !== 'number') {
  window.history.replaceState({ ...(window.history.state || {}), idx: 0 }, '');
}
ultimoIndice = indiceAtual();

export function navegar(rota: Rota, opcoes: { substituir?: boolean } = {}) {
  const url = caminhoDe(rota);
  if (url === window.location.hash) return;
  if (opcoes.substituir) window.history.replaceState({ idx: indiceAtual() }, '', url);
  else window.history.pushState({ idx: indiceAtual() + 1 }, '', url);
  atualizar();
}

/** Volta uma tela. Se o app foi aberto direto nesta tela, vai para a tela "pai". */
export function voltar() {
  if (indiceAtual() > 0) window.history.back();
  else navegar(telaPai(rotaAtual), { substituir: true });
}

export function useRota(): Rota {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => rotaAtual,
  );
}
