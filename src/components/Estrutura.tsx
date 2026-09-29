import { useEffect, useRef, useState, type ReactNode } from 'react';
import logo from '../assets/logo-elsys.jpg';
import { CONTATOS } from '../data/contatos';
import { registrarAcao, useOcorrencias } from '../lib/ocorrencias/store';
import { navegar, voltar, type Rota } from '../lib/router';
import { urlPublica, type Produto } from '../data/produtos';
import { Icone } from './Icone';

export function TopoMarca() {
  return (
    <header className="topo-marca">
      <img src={logo} alt="Elsys" width={117} height={26} />
      <div className="separador" aria-hidden="true" />
      <div className="titulos">
        <strong>Book Químico</strong>
        <span>Assistência Técnica · Engenharia</span>
      </div>
    </header>
  );
}

export function Cabecalho({
  titulo,
  subtitulo,
  vermelho,
  grande,
  children,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  vermelho?: boolean;
  /** Título grande abaixo do botão voltar (tela de emergência). */
  grande?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className={`cabecalho${vermelho ? ' vermelho' : ''}`}>
      {grande ? (
        <>
          <BotaoVoltar />
          <div className="titulos">
            <h1>{titulo}</h1>
            {subtitulo && <span className="subtitulo">{subtitulo}</span>}
          </div>
        </>
      ) : (
        <div className="linha">
          <BotaoVoltar />
          <div className="titulos">
            <h1 className="titulo">{titulo}</h1>
            {subtitulo && <span className="subtitulo">{subtitulo}</span>}
          </div>
        </div>
      )}
      {children}
    </header>
  );
}

function BotaoVoltar() {
  return (
    <button type="button" className="botao-voltar" onClick={voltar} aria-label="Voltar">
      <Icone nome="voltar" espessura={2.4} />
    </button>
  );
}

/** Botões de ligação para SAMU e Disque-Intoxicação. Cada toque fica no registro. */
export function FaixaEmergencia({ produto }: { produto?: Pick<Produto, 'id' | 'nome'> }) {
  return (
    <nav className="faixa-emergencia" aria-label="Telefones de emergência">
      <a className="ligar samu" href={`tel:${CONTATOS.samu.tel}`} onClick={() => registrarAcao('ligou_samu', produto)}>
        <Icone nome="telefone" tamanho={18} />
        <span className="rotulos">
          <span className="nome">Ligar {CONTATOS.samu.nome}</span>
          <span className="numero">{CONTATOS.samu.exibicao}</span>
        </span>
      </a>
      <a
        className="ligar intox"
        href={`tel:${CONTATOS.intoxicacao.tel}`}
        onClick={() => registrarAcao('ligou_intoxicacao', produto)}
      >
        <Icone nome="telefone" tamanho={18} />
        <span className="rotulos">
          <span className="nome">{CONTATOS.intoxicacao.nome}</span>
          <span className="numero">{CONTATOS.intoxicacao.exibicao}</span>
        </span>
      </a>
    </nav>
  );
}

type Aba = 'inicio' | 'documentos' | 'registros';

export function BarraAbas({ ativa }: { ativa: Aba }) {
  const { itens } = useOcorrencias();
  const abertas = itens.filter((o) => o.status === 'aberta').length;
  const ir = (rota: Rota, aba: Aba) => () => {
    if (aba !== ativa) navegar(rota);
  };
  return (
    <nav className="abas" aria-label="Menu principal">
      <button type="button" className="aba" aria-current={ativa === 'inicio' ? 'page' : undefined} onClick={ir({ tela: 'inicio' }, 'inicio')}>
        <Icone nome="casa" />
        Início
      </button>
      <button
        type="button"
        className="aba"
        aria-current={ativa === 'documentos' ? 'page' : undefined}
        onClick={ir({ tela: 'documentos' }, 'documentos')}
      >
        <Icone nome="livro" />
        Documentos
      </button>
      <button
        type="button"
        className="aba"
        aria-current={ativa === 'registros' ? 'page' : undefined}
        onClick={ir({ tela: 'registros' }, 'registros')}
      >
        <Icone nome="prancheta" />
        Registros
        {abertas > 0 && (
          <span className="contador" aria-label={`${abertas} aguardando detalhes`}>
            {abertas}
          </span>
        )}
      </button>
    </nav>
  );
}

export function FotoEmbalagem({ produto, tamanhoIcone = 34 }: { produto: Produto; tamanhoIcone?: number }) {
  const [erro, setErro] = useState(false);
  if (produto.foto && !erro) {
    return (
      <span className="foto-embalagem">
        <img src={urlPublica(produto.foto)} alt="" loading="lazy" decoding="async" onError={() => setErro(true)} />
      </span>
    );
  }
  return (
    <span className="foto-embalagem" aria-hidden="true">
      <Icone nome="frasco" tamanho={tamanhoIcone} espessura={1.7} />
      {tamanhoIcone >= 30 && <small>Foto da embalagem</small>}
    </span>
  );
}

/**
 * Área rolável da tela. Lembra a posição da rolagem de cada tela, então ao voltar
 * de uma ficha para a lista a pessoa continua exatamente onde estava.
 */
const posicoes = new Map<string, number>();

export function Rolagem({ chave, children, className }: { chave: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = posicoes.get(chave) ?? 0;
    const salvar = () => posicoes.set(chave, el.scrollTop);
    el.addEventListener('scroll', salvar, { passive: true });
    return () => el.removeEventListener('scroll', salvar);
  }, [chave]);
  return (
    <div ref={ref} className={`rolagem${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}

export function CampoBusca({
  id,
  valor,
  aoMudar,
  placeholder,
  rotulo,
  claro,
}: {
  id: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder: string;
  rotulo: string;
  claro?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="busca">
      <label htmlFor={id} className={claro ? 'visualmente-oculto' : undefined}>
        {rotulo}
      </label>
      <div className={`campo-busca${claro ? ' claro' : ''}`}>
        <Icone nome="busca" tamanho={18} />
        <input
          ref={ref}
          id={id}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={valor}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value)}
          onKeyDown={(e) => {
            // "Buscar" no teclado: fecha o teclado para mostrar os resultados.
            if (e.key === 'Enter') ref.current?.blur();
          }}
        />
        {valor && (
          <button
            type="button"
            className="limpar"
            aria-label="Limpar busca"
            onClick={() => {
              aoMudar('');
              ref.current?.focus();
            }}
          >
            <Icone nome="fechar" tamanho={18} />
          </button>
        )}
      </div>
    </div>
  );
}
