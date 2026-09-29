import { useEffect } from 'react';
import { Cabecalho, FaixaEmergencia, FotoEmbalagem, Rolagem } from '../components/Estrutura';
import { Icone, type NomeIcone } from '../components/Icone';
import { linkTelefone } from '../data/contatos';
import { AREAS, buscarProduto, formatarRevisao, type PrimeirosSocorros, type Produto as TProduto } from '../data/produtos';
import { avisar } from '../lib/aviso';
import { compartilharPdf, nomeArquivo, prepararArquivo, urlPdf } from '../lib/fichas';
import type { TipoAcao } from '../lib/ocorrencias/modelo';
import { ocorrenciaAtiva, registrarAcao, registrarSeEmAndamento } from '../lib/ocorrencias/store';
import { navegar } from '../lib/router';
import { formatarHora } from '../lib/ocorrencias/modelo';

const SOCORROS: { chave: keyof PrimeirosSocorros; titulo: string; icone: NomeIcone }[] = [
  { chave: 'inalacao', titulo: 'Inalação', icone: 'pulmao' },
  { chave: 'pele', titulo: 'Contato com a pele', icone: 'mao' },
  { chave: 'olhos', titulo: 'Contato com os olhos', icone: 'olho' },
  { chave: 'ingestao', titulo: 'Ingestão', icone: 'boca' },
  { chave: 'notasMedico', titulo: 'Notas para o médico', icone: 'estetoscopio' },
];

/** Mantém a tela acesa enquanto a ficha é mostrada ao médico (quando o navegador permite). */
function useTelaAcesa(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return;
    let trava: WakeLockSentinel | undefined;
    let cancelado = false;
    const pedir = async () => {
      try {
        trava = await navigator.wakeLock.request('screen');
        if (cancelado) void trava.release();
      } catch {
        /* sem permissão ou bateria fraca: segue normal */
      }
    };
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void pedir();
    };
    void pedir();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', aoVoltar);
      void trava?.release();
    };
  }, [ativo]);
}

export function Produto({ id, origem }: { id: string; origem: 'emergencia' | 'documentos' }) {
  const p = buscarProduto(id);
  const emergencia = origem === 'emergencia';
  useTelaAcesa(emergencia);
  useEffect(() => {
    if (p) void prepararArquivo(p);
  }, [p]);

  if (!p) {
    return (
      <div className="tela">
        <Cabecalho titulo="Ficha não encontrada" />
        <Rolagem chave={`produto-${id}`}>
          <div className="conteudo">
            <div className="vazio">Esta ficha não existe mais ou o link está incorreto.</div>
            <button type="button" className="botao primario" onClick={() => navegar({ tela: 'documentos' }, { substituir: true })}>
              Ver todos os documentos
            </button>
          </div>
        </Rolagem>
        <FaixaEmergencia />
      </div>
    );
  }

  const registrar = (tipo: TipoAcao) => (emergencia ? registrarAcao(tipo, p) : registrarSeEmAndamento(tipo, p));
  const pdf = urlPdf(p);
  const revisao = formatarRevisao(p.revisao);
  const ativa = emergencia ? ocorrenciaAtiva() : undefined;

  const enviar = async () => {
    registrar('compartilhou_pdf');
    const r = await compartilharPdf(p);
    if (r === 'copiado') avisar('Link da ficha copiado. Cole no WhatsApp ou e-mail.');
  };

  return (
    <div className="tela">
      <Cabecalho titulo="Ficha do produto" subtitulo={emergencia ? 'Mostre ao médico' : undefined} />
      <Rolagem chave={`produto-${p.id}`}>
        <div className="conteudo">
          <div className="cartao produto-resumo">
            <FotoEmbalagem produto={p} tamanhoIcone={32} />
            <div className="textos">
              <h2 className="nome">
                {p.nome}
              </h2>
              {p.fabricante && <span className="meta">Fabricante: {p.fabricante}</span>}
              {revisao && <span className="meta">FDS · revisão {revisao}</span>}
              <div className="etiquetas">
                {p.areas.map((a) => (
                  <span key={a} className="etiqueta">
                    {AREAS[a]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {p.exemplo && (
            <div className="faixa-aviso exemplo">
              <strong>Ficha de exemplo.</strong> Os textos abaixo ainda não são da FDS real deste produto.
            </div>
          )}

          <div className="faixa-aviso">
            <strong>Mostre esta tela ou a ficha completa ao médico.</strong> Se possível, leve também a embalagem do
            produto.
          </div>

          {ativa && (
            <div className="faixa-registro" role="status">
              <Icone nome="prancheta" tamanho={18} />
              <span>
                Ocorrência registrada às {formatarHora(ativa.criadoEm)}. Complete os detalhes depois.{' '}
                <a href={`#/registros/${ativa.id}`}>Abrir registro</a>
              </span>
            </div>
          )}

          {pdf ? (
            <>
              <a className="botao primario" href={pdf} target="_blank" rel="noopener" onClick={() => registrar('abriu_pdf')}>
                <Icone nome="documento" tamanho={20} />
                Abrir ficha completa (PDF)
              </a>
              <div className="botoes-2">
                <a className="botao" href={pdf} download={nomeArquivo(p)} onClick={() => registrar('baixou_pdf')}>
                  <Icone nome="baixar" tamanho={18} />
                  Baixar PDF
                </a>
                <button type="button" className="botao" onClick={enviar}>
                  <Icone nome="compartilhar" tamanho={18} />
                  Enviar
                </button>
              </div>
            </>
          ) : (
            <div className="faixa-aviso">O PDF desta ficha ainda não foi cadastrado. Use as informações abaixo.</div>
          )}

          <ContatoFabricante p={p} aoLigar={() => registrar('ligou_fabricante')} />

          {p.perigos && p.perigos.length > 0 && (
            <section className="cartao" aria-labelledby="t-perigos">
              <h2 id="t-perigos" className="cartao-titulo">
                Principais perigos · seção 2 da FDS
              </h2>
              <div className="etiquetas">
                {p.perigos.map((x) => (
                  <span key={x} className="etiqueta vermelha">
                    {x}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="cartao" aria-labelledby="t-socorros">
            <h2 id="t-socorros" className="cartao-titulo">
              Primeiros socorros · seção 4 da FDS
            </h2>
            {SOCORROS.filter((s) => p.primeirosSocorros?.[s.chave]).map((s) => (
              <div key={s.chave} className="bloco-socorro">
                <h3>
                  <Icone nome={s.icone} tamanho={18} />
                  {s.titulo}
                </h3>
                <p className="texto-ficha">{p.primeirosSocorros![s.chave]}</p>
              </div>
            ))}
            {!SOCORROS.some((s) => p.primeirosSocorros?.[s.chave]) && (
              <p className="texto-ficha">Consulte a seção 4 da ficha completa (PDF).</p>
            )}
          </section>

          {p.composicao && (
            <section className="cartao" aria-labelledby="t-composicao">
              <h2 id="t-composicao" className="cartao-titulo">
                Composição · seção 3 da FDS
              </h2>
              <p className="texto-ficha">{p.composicao}</p>
            </section>
          )}

          {p.uso && (
            <section className="cartao" aria-labelledby="t-uso">
              <h2 id="t-uso" className="cartao-titulo">
                Onde é usado
              </h2>
              <p className="texto-ficha">{p.uso}</p>
            </section>
          )}
        </div>
      </Rolagem>
      <FaixaEmergencia produto={p} />
    </div>
  );
}

function ContatoFabricante({ p, aoLigar }: { p: TProduto; aoLigar: () => void }) {
  return (
    <div className="cartao contato-fabricante">
      <div className="textos">
        <span className="cartao-titulo">Emergência do fabricante</span>
        <span className="numero">{p.telefoneEmergencia || 'Veja a seção 1 da ficha completa'}</span>
      </div>
      {p.telefoneEmergencia && (
        <a className="botao-icone" href={linkTelefone(p.telefoneEmergencia)} onClick={aoLigar} aria-label="Ligar para o fabricante">
          <Icone nome="telefone" />
        </a>
      )}
    </div>
  );
}
