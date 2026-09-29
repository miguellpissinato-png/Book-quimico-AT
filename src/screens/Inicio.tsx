import { BarraAbas, FaixaEmergencia, Rolagem, TopoMarca } from '../components/Estrutura';
import { Icone } from '../components/Icone';
import { CONTATOS } from '../data/contatos';
import { PRODUTOS } from '../data/produtos';
import { navegar } from '../lib/router';

const temExemplos = PRODUTOS.some((p) => p.exemplo);

export function Inicio() {
  return (
    <div className="tela">
      <TopoMarca />
      <Rolagem chave="inicio">
        <div className="conteudo">
          <div className="inicio-intro">
            <span className="sobretitulo">Fichas de segurança (FDS)</span>
            <h1>O que você precisa agora?</h1>
          </div>

          <button type="button" className="cartao-acao emergencia" onClick={() => navegar({ tela: 'emergencia' })}>
            <span className="icone">
              <Icone nome="alerta" tamanho={28} espessura={2.2} />
            </span>
            <span className="textos">
              <span className="titulo">Houve um acidente</span>
              <span className="descricao">Encontre a ficha do produto para mostrar ao médico</span>
            </span>
          </button>

          <button type="button" className="cartao-acao" onClick={() => navegar({ tela: 'documentos' })}>
            <span className="icone">
              <Icone nome="livro" tamanho={26} />
            </span>
            <span className="textos">
              <span className="titulo">Consultar documentos</span>
              <span className="descricao">Todas as fichas de segurança para leitura</span>
            </span>
          </button>

          <div className="alerta">
            <Icone nome="info" />
            <p>
              <strong>Acidente grave?</strong> Ligue para o SAMU ({CONTATOS.samu.exibicao}) antes de tudo. Depois use
              este app para levar a ficha do produto ao atendimento.
            </p>
          </div>

          {temExemplos && <p className="nota-rodape">Algumas fichas ainda contêm dados de exemplo.</p>}
        </div>
      </Rolagem>
      <FaixaEmergencia />
      <BarraAbas ativa="inicio" />
    </div>
  );
}
