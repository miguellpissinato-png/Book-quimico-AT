import { useSyncExternalStore } from 'react';

/** Mensagens curtas que aparecem por alguns segundos na parte de baixo da tela. */
export type Aviso = { id: number; texto: string; acao?: { rotulo: string; executar: () => void }; fixo?: boolean };

let atual: Aviso | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const ouvintes = new Set<() => void>();

function publicar(a: Aviso | null) {
  atual = a;
  ouvintes.forEach((f) => f());
}

export function avisar(texto: string, opcoes: { acao?: Aviso['acao']; fixo?: boolean; duracao?: number } = {}) {
  clearTimeout(timer);
  publicar({ id: ++seq, texto, acao: opcoes.acao, fixo: opcoes.fixo });
  if (!opcoes.fixo) timer = setTimeout(() => publicar(null), opcoes.duracao ?? 3200);
}

export function fecharAviso() {
  clearTimeout(timer);
  publicar(null);
}

export function useAviso(): Aviso | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
  );
}
