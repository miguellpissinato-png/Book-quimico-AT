import { useDeferredValue, useMemo, useState } from 'react';
import { Cabecalho, CampoBusca, FaixaEmergencia, FotoEmbalagem, Rolagem } from '../components/Estrutura';
import { filtrarProdutos, ordemEmergencia, PRODUTOS, type Produto } from '../data/produtos';
import { registrarAcao } from '../lib/ocorrencias/store';
import { navegar } from '../lib/router';

const ordenados = [...PRODUTOS].sort(ordemEmergencia);
let buscaSalva = '';

function escolher(p: Produto) {
  registrarAcao('produto_consultado', p);
  navegar({ tela: 'produto', id: p.id, origem: 'emergencia' });
}

export function Emergencia() {
  const [busca, setBusca] = useState(buscaSalva);
  const termo = useDeferredValue(busca);
  const lista = useMemo(() => filtrarProdutos(ordenados, termo), [termo]);

  const mudarBusca = (v: string) => {
    buscaSalva = v;
    setBusca(v);
  };

  return (
    <div className="tela">
      <Cabecalho vermelho grande titulo="Qual produto causou o acidente?" subtitulo="Toque na embalagem correspondente" />
      <Rolagem chave="emergencia">
        <div className="conteudo">
          {PRODUTOS.length > 8 && (
            <CampoBusca
              id="busca-emergencia"
              claro
              rotulo="Buscar produto"
              valor={busca}
              aoMudar={mudarBusca}
              placeholder="Digite o nome do produto"
            />
          )}
          <div className="grade">
            {lista.map((p) => (
              <button key={p.id} type="button" className="cartao-produto" onClick={() => escolher(p)}>
                <FotoEmbalagem produto={p} />
                <span className="nome">{p.nome}</span>
              </button>
            ))}
          </div>
          {lista.length === 0 && <div className="vazio">Nenhum produto com esse nome. Veja a lista completa abaixo.</div>}
          <button type="button" className="botao-tracejado" onClick={() => navegar({ tela: 'documentos' })}>
            Não encontrou? Ver lista completa de documentos
          </button>
        </div>
      </Rolagem>
      <FaixaEmergencia />
    </div>
  );
}
