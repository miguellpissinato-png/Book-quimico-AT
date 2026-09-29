import { describe, expect, it } from 'vitest';
import dados from '../src/data/produtos.json';
import { filtrarProdutos, formatarRevisao, ordemEmergencia, semAcento, type Produto } from '../src/data/produtos';
import fs from 'node:fs';
import path from 'node:path';

const produtos = dados as Produto[];

describe('busca de produtos', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(semAcento('Álcool ISOPROPÍLICO')).toBe('alcool isopropilico');
    const lista: Produto[] = [{ id: 'a', nome: 'Álcool isopropílico', areas: ['assistencia'] }];
    expect(filtrarProdutos(lista, 'ALCOOL iso')).toHaveLength(1);
  });
  it('encontra por sinônimo e fabricante', () => {
    const lista: Produto[] = [{ id: 'a', nome: 'Adesivo', sinonimos: ['super cola'], fabricante: 'Loctite', areas: ['engenharia'] }];
    expect(filtrarProdutos(lista, 'super cola')).toHaveLength(1);
    expect(filtrarProdutos(lista, 'loctite')).toHaveLength(1);
    expect(filtrarProdutos(lista, 'graxa')).toHaveLength(0);
  });
  it('filtra por área', () => {
    const lista: Produto[] = [
      { id: 'a', nome: 'A', areas: ['assistencia'] },
      { id: 'b', nome: 'B', areas: ['engenharia', 'assistencia'] },
    ];
    expect(filtrarProdutos(lista, '', 'engenharia').map((p) => p.id)).toEqual(['b']);
    expect(filtrarProdutos(lista, '', 'assistencia')).toHaveLength(2);
  });
  it('coloca destaques primeiro na emergência', () => {
    const ordenados = [...produtos].sort(ordemEmergencia);
    const primeiroSemDestaque = ordenados.findIndex((p) => !p.destaque);
    expect(ordenados.slice(primeiroSemDestaque).some((p) => p.destaque)).toBe(false);
  });
  it('formata data de revisão', () => {
    expect(formatarRevisao('2025-01-15')).toBe('15/01/2025');
  });
});

describe('cadastro das fichas (src/data/produtos.json)', () => {
  it('ids únicos e sem espaços', () => {
    const ids = produtos.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  it('toda ficha tem PDF cadastrado', () => {
    for (const p of produtos) expect(p.pdf, p.id).toBeTruthy();
  });
  it('toda ficha tem nome e ao menos uma área válida', () => {
    for (const p of produtos) {
      expect(p.nome, p.id).toBeTruthy();
      expect(p.areas.length, p.id).toBeGreaterThan(0);
      for (const a of p.areas) expect(['assistencia', 'engenharia'], p.id).toContain(a);
    }
  });
  it('PDFs e fotos cadastrados existem em public/', () => {
    for (const p of produtos) {
      for (const arq of [p.pdf, p.foto]) {
        if (arq) expect(fs.existsSync(path.join('public', arq)), `${p.id}: ${arq} não encontrado`).toBe(true);
      }
    }
  });
});
