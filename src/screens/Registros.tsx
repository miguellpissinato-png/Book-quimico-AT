import { useMemo, useState } from 'react';
import { BarraAbas, Cabecalho, Rolagem } from '../components/Estrutura';
import { Icone } from '../components/Icone';
import { avisar } from '../lib/aviso';
import { formatarDataHora, gerarCsv, ROTULO_ACAO, ROTULO_STATUS, type Ocorrencia, type StatusOcorrencia } from '../lib/ocorrencias/modelo';
import { criarManual, sincronizar, useOcorrencias, type EstadoSync } from '../lib/ocorrencias/store';
import { navegar } from '../lib/router';

type Filtro = 'aberta' | 'concluida' | 'todas';
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'aberta', rotulo: 'Aguardando detalhes' },
  { valor: 'concluida', rotulo: 'Concluídas' },
];
let filtroSalvo: Filtro = 'todas';

export function Registros() {
  const { itens, sync } = useOcorrencias();
  const [filtro, setFiltro] = useState<Filtro>(filtroSalvo);
  const lista = useMemo(
    () => itens.filter((o) => (filtro === 'todas' ? o.status !== 'descartada' : o.status === filtro)),
    [itens, filtro],
  );

  const nova = () => navegar({ tela: 'registro', id: criarManual() });

  const exportar = () => {
    const visiveis = itens.filter((o) => o.status !== 'descartada');
    if (visiveis.length === 0) return avisar('Ainda não há registros para exportar.');
    const blob = new Blob([gerarCsv(visiveis)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocorrencias-book-quimico-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="tela">
      <Cabecalho titulo="Registro de ocorrências" subtitulo={<StatusSync sync={sync} />}>
        <div className="filtros" role="group" aria-label="Filtrar registros">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              className="filtro"
              aria-pressed={filtro === f.valor}
              onClick={() => {
                filtroSalvo = f.valor;
                setFiltro(f.valor);
              }}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </Cabecalho>
      <Rolagem chave="registros">
        <div className="conteudo">
          <div className="botoes-2">
            <button type="button" className="botao primario compacto" onClick={nova}>
              <Icone nome="mais" tamanho={18} />
              Nova ocorrência
            </button>
            <button type="button" className="botao" onClick={exportar}>
              <Icone nome="planilha" tamanho={18} />
              Exportar planilha
            </button>
          </div>

          <div className="lista">
            {lista.map((o) => (
              <ItemOcorrencia key={o.id} o={o} />
            ))}
          </div>

          {lista.length === 0 && (
            <div className="vazio">
              {itens.length === 0
                ? 'Nenhuma ocorrência registrada. Quando alguém usar o botão "Houve um acidente" ou ligar para o SAMU pelo app, o registro aparece aqui automaticamente.'
                : 'Nenhuma ocorrência neste filtro.'}
            </div>
          )}
        </div>
      </Rolagem>
      <BarraAbas ativa="registros" />
    </div>
  );
}

function StatusSync({ sync }: { sync: EstadoSync }) {
  if (sync.modo === 'local') {
    return (
      <span className="status-sync">
        <span className="ponto local" />
        Salvos neste celular
      </span>
    );
  }
  const pendente = sync.pendentes > 0 || !!sync.erro;
  return (
    <button
      type="button"
      className="status-sync"
      onClick={() => void sincronizar()}
      title={sync.erro}
    >
      <span className={`ponto${pendente ? ' pendente' : ''}`} />
      {sync.sincronizando
        ? 'Sincronizando…'
        : pendente
          ? `${sync.pendentes} aguardando envio · tocar para tentar`
          : 'Compartilhados com a equipe'}
    </button>
  );
}

const ETIQUETA_STATUS: Record<StatusOcorrencia, string> = {
  aberta: 'etiqueta vermelha',
  concluida: 'etiqueta verde',
  descartada: 'etiqueta cinza',
};

function ItemOcorrencia({ o }: { o: Ocorrencia }) {
  const produtos = o.produtos.map((p) => p.nome).join(', ');
  const ultima = o.acoes[o.acoes.length - 1];
  return (
    <button type="button" className={`item-lista item-ocorrencia ${o.status}`} onClick={() => navegar({ tela: 'registro', id: o.id })}>
      <span className="icone">
        <Icone nome={o.status === 'concluida' ? 'check' : 'alerta'} tamanho={20} />
      </span>
      <span className="textos">
        <span className="linha-topo">
          <span className="meta">{formatarDataHora(o.criadoEm)}</span>
          <span className={ETIQUETA_STATUS[o.status]}>{ROTULO_STATUS[o.status]}</span>
        </span>
        <span className="nome">{produtos || 'Produto não informado'}</span>
        <span className="meta">
          {[o.local, o.responsavel].filter(Boolean).join(' · ') || (ultima ? ROTULO_ACAO[ultima.tipo] : '')}
        </span>
      </span>
      <Icone nome="seta" tamanho={18} espessura={2.2} className="seta" />
    </button>
  );
}
