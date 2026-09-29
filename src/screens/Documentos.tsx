import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { BarraAbas, Cabecalho, CampoBusca, FotoEmbalagem, Rolagem } from '../components/Estrutura';
import { Icone } from '../components/Icone';
import { filtrarProdutos, formatarRevisao, ordemAlfabetica, PRODUTOS } from '../data/produtos';
import { avisar } from '../lib/aviso';
import { contarPdfsOffline, salvarTodosOffline } from '../lib/fichas';
import { navegar } from '../lib/router';

const ordenados = [...PRODUTOS].sort(ordemAlfabetica);
// Guardada fora do componente: ao voltar de uma ficha, a busca continua igual.
let buscaSalva = '';

export function Documentos() {
  const [busca, setBusca] = useState(buscaSalva);
  const termo = useDeferredValue(busca);
  const lista = useMemo(() => filtrarProdutos(ordenados, termo), [termo]);

  const mudarBusca = (v: string) => {
    buscaSalva = v;
    setBusca(v);
  };

  const total = PRODUTOS.length;
  const subtitulo = `${total} ficha${total === 1 ? '' : 's'} de segurança`;

  return (
    <div className="tela">
      <Cabecalho titulo="Todos os documentos" subtitulo={subtitulo}>
        <CampoBusca
          id="busca-documentos"
          rotulo="Buscar produto"
          valor={busca}
          aoMudar={mudarBusca}
          placeholder="Ex.: álcool, fluxo, spray…"
        />
      </Cabecalho>
      <Rolagem chave="documentos">
        <div className="conteudo">
          {termo && (
            <span className="salvo-em" aria-live="polite">
              {lista.length} resultado{lista.length === 1 ? '' : 's'}
            </span>
          )}
          <div className="lista">
            {lista.map((p) => (
              <button
                key={p.id}
                type="button"
                className="item-lista"
                onClick={() => navegar({ tela: 'produto', id: p.id, origem: 'documentos' })}
              >
                <span className="icone">
                  {p.foto ? <FotoEmbalagem produto={p} tamanhoIcone={20} /> : <Icone nome="documento" tamanho={20} />}
                </span>
                <span className="textos">
                  <span className="nome">{p.nome}</span>
                  <span className="meta">
                    {[p.fabricante, p.revisao && `FDS rev. ${formatarRevisao(p.revisao)}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <Icone nome="seta" tamanho={18} espessura={2.2} className="seta" />
              </button>
            ))}
          </div>
          {lista.length === 0 && (
            <div className="vazio">Nenhum produto encontrado. Tente outro nome, a marca ou o fabricante.</div>
          )}
          <UsoOffline />
        </div>
      </Rolagem>
      <BarraAbas ativa="documentos" />
    </div>
  );
}

/** Cartão para guardar todos os PDFs no celular (uso em locais sem sinal). */
function UsoOffline() {
  const [contagem, setContagem] = useState<{ salvos: number; total: number } | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);

  useEffect(() => {
    if (!('caches' in window)) return;
    contarPdfsOffline().then(setContagem, () => undefined);
  }, []);

  if (!('caches' in window) || !contagem || contagem.total === 0) return null;
  const completo = contagem.salvos >= contagem.total;

  const salvar = async () => {
    setProgresso(0);
    const falhas = await salvarTodosOffline((feito, total) => setProgresso(feito / total));
    setProgresso(null);
    setContagem(await contarPdfsOffline());
    avisar(falhas ? `${falhas} ficha(s) não puderam ser salvas. Verifique a internet e tente de novo.` : 'Pronto! Todas as fichas abrem sem internet neste celular.');
  };

  return (
    <section className="cartao" aria-labelledby="t-offline" style={{ marginTop: '0.5rem' }}>
      <h2 id="t-offline" className="cartao-titulo">
        Usar sem internet
      </h2>
      <p className="texto-ficha">
        {completo
          ? 'Todas as fichas em PDF estão salvas neste celular e abrem mesmo sem sinal.'
          : `${contagem.salvos} de ${contagem.total} fichas em PDF salvas neste celular. Salve todas para abrir mesmo em locais sem sinal.`}
      </p>
      {progresso !== null ? (
        <div className="progresso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso * 100)}>
          <div style={{ width: `${progresso * 100}%` }} />
        </div>
      ) : (
        !completo && (
          <button type="button" className="botao" onClick={salvar}>
            <Icone nome="baixar" tamanho={18} />
            Salvar fichas no celular
          </button>
        )
      )}
    </section>
  );
}
