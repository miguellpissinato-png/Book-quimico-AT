import { describe, expect, it } from 'vitest';
import { comAcao, gerarCsv, mesclar, novaOcorrencia } from '../src/lib/ocorrencias/modelo';

describe('ocorrências', () => {
  it('acrescenta ação e produto sem duplicar', () => {
    let o = novaOcorrencia('1', '2026-01-01T10:00:00.000Z');
    o = comAcao(o, { tipo: 'produto_consultado', em: '2026-01-01T10:01:00.000Z', produtoId: 'a', produtoNome: 'A' });
    o = comAcao(o, { tipo: 'ligou_samu', em: '2026-01-01T10:02:00.000Z', produtoId: 'a', produtoNome: 'A' });
    expect(o.produtos).toEqual([{ id: 'a', nome: 'A' }]);
    expect(o.acoes).toHaveLength(2);
    expect(o.atualizadoEm).toBe('2026-01-01T10:02:00.000Z');
  });

  it('mescla: pendente local vence; senão vence o mais recente', () => {
    const base = novaOcorrencia('1', '2026-01-01T10:00:00.000Z');
    const local = { ...base, responsavel: 'local', atualizadoEm: '2026-01-01T10:05:00.000Z' };
    const remoto = { ...base, responsavel: 'remoto', atualizadoEm: '2026-01-01T10:09:00.000Z' };
    expect(mesclar([local], [remoto], new Set())[0].responsavel).toBe('remoto');
    expect(mesclar([local], [remoto], new Set(['1']))[0].responsavel).toBe('local');
    const outro = novaOcorrencia('2', '2026-01-02T10:00:00.000Z');
    expect(mesclar([local], [outro], new Set()).map((o) => o.id)).toEqual(['2', '1']);
  });

  it('gera CSV para Excel com escape de ; e aspas', () => {
    const o = { ...novaOcorrencia('1', '2026-01-01T10:00:00.000Z'), descricao: 'caiu; "muito"' };
    const csv = gerarCsv([o]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"caiu; ""muito"""');
  });
});
