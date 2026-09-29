import { useEffect, useRef, useState } from 'react';
import { Cabecalho, Rolagem } from '../components/Estrutura';
import { Icone } from '../components/Icone';
import { ordemAlfabetica, PRODUTOS, semAcento } from '../data/produtos';
import { avisar } from '../lib/aviso';
import {
  AREAS,
  formatarDataHora,
  formatarHora,
  ROTULO_ACAO,
  ROTULO_EXPOSICAO,
  ROTULO_STATUS,
  type CamposEditaveis,
  type Exposicao,
} from '../lib/ocorrencias/modelo';
import { atualizar, useOcorrencias } from '../lib/ocorrencias/store';
import { navegar, voltar } from '../lib/router';

type Form = Omit<CamposEditaveis, 'status'>;

const OUTRO = '__outro';
const produtosOrdenados = [...PRODUTOS].sort(ordemAlfabetica);
const idsCadastrados = new Set(PRODUTOS.map((p) => p.id));

export function RegistroDetalhe({ id }: { id: string }) {
  const { itens } = useOcorrencias();
  const o = itens.find((x) => x.id === id);

  if (!o) {
    return (
      <div className="tela">
        <Cabecalho titulo="Ocorrência" />
        <Rolagem chave={`registro-${id}`}>
          <div className="conteudo">
            <div className="vazio">Registro não encontrado neste celular.</div>
          </div>
        </Rolagem>
      </div>
    );
  }

  return <Formulario key={o.id} id={o.id} />;
}

function Formulario({ id }: { id: string }) {
  const { itens } = useOcorrencias();
  const o = itens.find((x) => x.id === id)!;
  const [form, setForm] = useState<Form>(() => ({
    produtos: o.produtos,
    responsavel: o.responsavel,
    local: o.local,
    area: o.area,
    exposicao: o.exposicao,
    pessoaAtendida: o.pessoaAtendida,
    descricao: o.descricao,
    encaminhamento: o.encaminhamento,
  }));

  // Salvamento automático: 600 ms depois da última alteração (e ao sair da tela).
  const pendente = useRef<Partial<Form> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gravarAgora = () => {
    clearTimeout(timer.current);
    if (pendente.current) {
      atualizar(id, pendente.current);
      pendente.current = null;
    }
  };
  useEffect(() => gravarAgora, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = <K extends keyof Form>(campo: K, valor: Form[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    pendente.current = { ...pendente.current, [campo]: valor };
    clearTimeout(timer.current);
    timer.current = setTimeout(gravarAgora, 600);
  };

  const [digitandoOutro, setDigitandoOutro] = useState(false);
  const [nomeOutro, setNomeOutro] = useState('');

  const adicionarProduto = (produtoId: string) => {
    if (produtoId === OUTRO) return setDigitandoOutro(true);
    const p = PRODUTOS.find((x) => x.id === produtoId);
    if (p && !form.produtos.some((x) => x.id === p.id)) mudar('produtos', [...form.produtos, { id: p.id, nome: p.nome }]);
  };
  const adicionarOutro = () => {
    const nome = nomeOutro.trim();
    if (!nome) return;
    const idOutro = 'outro-' + semAcento(nome).replace(/[^a-z0-9]+/g, '-');
    if (!form.produtos.some((x) => x.id === idOutro)) mudar('produtos', [...form.produtos, { id: idOutro, nome }]);
    setNomeOutro('');
    setDigitandoOutro(false);
  };
  const removerProduto = (produtoId: string) =>
    mudar(
      'produtos',
      form.produtos.filter((x) => x.id !== produtoId),
    );

  const alternarExposicao = (e: Exposicao) =>
    mudar('exposicao', form.exposicao.includes(e) ? form.exposicao.filter((x) => x !== e) : [...form.exposicao, e]);

  const mudarStatus = (status: CamposEditaveis['status']) => {
    if (status === 'concluida' && form.produtos.length === 0) {
      if (!window.confirm('Nenhum produto foi informado. Concluir o registro mesmo assim?')) return;
    }
    gravarAgora();
    atualizar(id, { status });
    if (status === 'concluida') {
      avisar('Registro concluído.');
      voltar();
    } else if (status === 'descartada') {
      avisar('Registro descartado.');
      voltar();
    }
  };

  return (
    <div className="tela">
      <Cabecalho titulo="Ocorrência" subtitulo={formatarDataHora(o.criadoEm)} />
      <Rolagem chave={`registro-${id}`}>
        <form className="conteudo" onSubmit={(e) => e.preventDefault()} autoComplete="off">
          <div className="etiquetas">
            <span className={`etiqueta ${o.status === 'aberta' ? 'vermelha' : o.status === 'concluida' ? 'verde' : 'cinza'}`}>
              {ROTULO_STATUS[o.status]}
            </span>
          </div>

          <section className="cartao" aria-labelledby="t-acoes">
            <h2 id="t-acoes" className="cartao-titulo">
              O que foi feito pelo app
            </h2>
            <ol className="linha-tempo">
              {o.acoes.map((a, i) => (
                <li key={i}>
                  <time dateTime={a.em}>{formatarHora(a.em)}</time>
                  <span>
                    {ROTULO_ACAO[a.tipo]}
                    {a.produtoNome && a.tipo !== 'produto_consultado' ? ` — ${a.produtoNome}` : ''}
                    {a.tipo === 'produto_consultado' && a.produtoNome ? `: ${a.produtoNome}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="cartao" aria-labelledby="t-detalhes">
            <h2 id="t-detalhes" className="cartao-titulo">
              Detalhes da ocorrência
            </h2>

            <div className="campo">
              <label htmlFor="f-produto">Produto envolvido</label>
              {form.produtos.length > 0 && (
                <ul className="produtos-escolhidos">
                  {form.produtos.map((p) => (
                    <li key={p.id}>
                      {idsCadastrados.has(p.id) ? (
                        <a href={`#/produto/${encodeURIComponent(p.id)}`}>
                          <Icone nome="documento" tamanho={16} />
                          {p.nome}
                        </a>
                      ) : (
                        <span>{p.nome}</span>
                      )}
                      <button type="button" aria-label={`Remover ${p.nome}`} onClick={() => removerProduto(p.id)}>
                        <Icone nome="fechar" tamanho={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <select id="f-produto" value="" onChange={(e) => adicionarProduto(e.target.value)}>
                <option value="">{form.produtos.length ? 'Adicionar outro produto…' : 'Selecione o produto…'}</option>
                {produtosOrdenados
                  .filter((p) => !form.produtos.some((x) => x.id === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                <option value={OUTRO}>Outro (não está na lista)…</option>
              </select>
              {digitandoOutro && (
                <div className="linha-outro">
                  <input
                    aria-label="Nome do produto"
                    value={nomeOutro}
                    onChange={(e) => setNomeOutro(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarOutro();
                      }
                    }}
                    enterKeyHint="done"
                    placeholder="Nome do produto"
                    autoFocus
                  />
                  <button type="button" className="botao" onClick={adicionarOutro}>
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            <div className="campo">
              <label htmlFor="f-responsavel">Quem está registrando</label>
              <input
                id="f-responsavel"
                value={form.responsavel}
                onChange={(e) => mudar('responsavel', e.target.value)}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                placeholder="Seu nome"
              />
            </div>

            <div className="campo">
              <label htmlFor="f-local">Local / setor</label>
              <input
                id="f-local"
                value={form.local}
                onChange={(e) => mudar('local', e.target.value)}
                enterKeyHint="next"
                placeholder="Ex.: Bancada 3, cliente X"
              />
            </div>

            <div className="campo">
              <label htmlFor="f-area">Área</label>
              <select id="f-area" value={form.area} onChange={(e) => mudar('area', e.target.value as Form['area'])}>
                <option value="">Selecione…</option>
                {Object.entries(AREAS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
                <option value="outra">Outra</option>
              </select>
            </div>

            <fieldset className="campo">
              <legend>Tipo de exposição</legend>
              <div className="opcoes">
                {(Object.keys(ROTULO_EXPOSICAO) as Exposicao[]).map((e) => (
                  <label key={e} className="opcao">
                    <input type="checkbox" checked={form.exposicao.includes(e)} onChange={() => alternarExposicao(e)} />
                    <span>{ROTULO_EXPOSICAO[e]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="campo">
              <label htmlFor="f-pessoa">Pessoa atendida (opcional)</label>
              <input
                id="f-pessoa"
                value={form.pessoaAtendida}
                onChange={(e) => mudar('pessoaAtendida', e.target.value)}
                enterKeyHint="next"
                placeholder="Nome ou matrícula"
              />
            </div>

            <div className="campo">
              <label htmlFor="f-descricao">O que aconteceu</label>
              <textarea
                id="f-descricao"
                value={form.descricao}
                onChange={(e) => mudar('descricao', e.target.value)}
                rows={4}
                placeholder="Descreva rapidamente o acidente"
              />
            </div>

            <div className="campo">
              <label htmlFor="f-encaminhamento">Encaminhamento</label>
              <textarea
                id="f-encaminhamento"
                value={form.encaminhamento}
                onChange={(e) => mudar('encaminhamento', e.target.value)}
                rows={2}
                placeholder="Ex.: levado à UPA, atendido no local, SAMU acionado"
              />
            </div>
            <span className="salvo-em">
              <Icone nome="check" tamanho={12} /> Salvo automaticamente
            </span>
          </section>

          {o.status === 'aberta' && (
            <>
              <button type="button" className="botao sucesso" onClick={() => mudarStatus('concluida')}>
                <Icone nome="check" tamanho={18} />
                Concluir registro
              </button>
              <button
                type="button"
                className="botao perigo"
                onClick={() => {
                  if (window.confirm('Descartar esta ocorrência? Use apenas se foi aberta por engano.')) mudarStatus('descartada');
                }}
              >
                Descartar (aberta por engano)
              </button>
            </>
          )}
          {o.status !== 'aberta' && (
            <button type="button" className="botao" onClick={() => mudarStatus('aberta')}>
              Reabrir registro
            </button>
          )}
          <button type="button" className="botao-tracejado" onClick={() => navegar({ tela: 'registros' }, { substituir: true })}>
            Ver todos os registros
          </button>
        </form>
      </Rolagem>
    </div>
  );
}
