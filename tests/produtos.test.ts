import { describe, expect, it } from 'vitest';
import dados from '../src/data/produtos.json';
import { filtrarProdutos, formatarRevisao, ordemEmergencia, semAcento, type Produto } from '../src/data/produtos';
import fs from 'node:fs';
import path from 'node:path';

const produtos = dados as Produto[];

describe('busca de produtos', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(semAcento('Álcool ISOPROPÍLICO')).toBe('alcool isopropilico');
    const lista: Produto[] = [{ id: 'a', nome: 'Álcool isopropílico' }];
    expect(filtrarProdutos(lista, 'ALCOOL iso')).toHaveLength(1);
  });
  it('encontra por sinônimo e fabricante', () => {
    const lista: Produto[] = [{ id: 'a', nome: 'Adesivo', sinonimos: ['super cola'], fabricante: 'Loctite' }];
    expect(filtrarProdutos(lista, 'super cola')).toHaveLength(1);
    expect(filtrarProdutos(lista, 'loctite')).toHaveLength(1);
    expect(filtrarProdutos(lista, 'graxa')).toHaveLength(0);
  });
  it('sem busca, mostra todas as fichas', () => {
    const lista: Produto[] = [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }];
    expect(filtrarProdutos(lista, '  ')).toHaveLength(2);
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
  it('toda ficha tem nome', () => {
    for (const p of produtos) expect(p.nome, p.id).toBeTruthy();
  });
  it('PDFs e fotos cadastrados existem em public/', () => {
    for (const p of produtos) {
      for (const arq of [p.pdf, p.foto]) {
        if (arq) expect(fs.existsSync(path.join('public', arq)), `${p.id}: ${arq} não encontrado`).toBe(true);
      }
    }
  });
});

describe('nome do PDF baixado', async () => {
  const { nomeArquivo } = await import('../src/lib/fichas');
  it('não tem acentos nem símbolos (navegadores trocam o nome por "download")', () => {
    for (const p of produtos) {
      const nome = nomeArquivo(p);
      expect(nome, p.id).toMatch(/^FDS (NAO ORIGINAL \(referencia\) )?- [A-Za-z0-9 ()\-.,]+\.pdf$/);
    }
    expect(nomeArquivo({ id: 'x', nome: 'Álcool gel 70° INPM' })).toBe('FDS - Alcool gel 70 INPM.pdf');
  });
});

describe('FDS não original (ficha de referência de outro produto)', async () => {
  const { nomeArquivo } = await import('../src/lib/fichas');
  const naoOriginais = produtos.filter((p) => p.fdsNaoOriginal);

  it('diz de qual produto é a ficha e por que não há a original', () => {
    for (const p of naoOriginais) {
      expect(p.fdsNaoOriginal?.referencia?.trim(), p.id).toBeTruthy();
      expect(p.fdsNaoOriginal?.motivo?.trim(), p.id).toBeTruthy();
    }
  });

  it('ficha descrita como genérica ou de referência está marcada como não original', () => {
    const suspeita = /gen[eé]ric|refer[eê]ncia|n[aã]o original/i;
    for (const p of produtos) {
      const textos = [p.nome, p.fabricante, p.aviso, ...(p.sinonimos || [])].filter(Boolean).join(' ');
      if (suspeita.test(textos)) expect(p.fdsNaoOriginal, `${p.id} parece usar FDS de outro produto`).toBeTruthy();
    }
  });

  it('o PDF tem a capa e a faixa de "FDS NÃO ORIGINAL"', () => {
    for (const p of naoOriginais) {
      const pdf = fs.readFileSync(path.join('public', p.pdf!));
      expect(pdf.includes('FDSNAOORIGINAL'), `${p.id}: marque o PDF antes de publicar`).toBe(true);
    }
  });

  it('o PDF baixado avisa no nome do arquivo', () => {
    for (const p of naoOriginais) expect(nomeArquivo(p), p.id).toMatch(/^FDS NAO ORIGINAL/);
    for (const p of produtos.filter((x) => !x.fdsNaoOriginal)) expect(nomeArquivo(p)).toMatch(/^FDS - /);
  });
});
