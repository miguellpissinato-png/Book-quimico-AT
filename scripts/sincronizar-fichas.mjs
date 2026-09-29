#!/usr/bin/env node
/**
 * Cadastra automaticamente as fichas a partir dos PDFs.
 *
 *   npm run fichas
 *
 * 1. Coloque os PDFs em public/fichas/pdf/assistencia/ e/ou public/fichas/pdf/engenharia/
 *    (a pasta define a área; o mesmo arquivo pode estar nas duas).
 *    PDFs soltos em public/fichas/pdf/ entram como "assistencia".
 * 2. (Opcional) Coloque a foto da embalagem em public/fichas/fotos/ com o MESMO nome do PDF
 *    (.jpg, .jpeg, .png ou .webp).
 * 3. Rode o comando. Cada PDF novo vira um produto em src/data/produtos.json, com o nome
 *    tirado do nome do arquivo ("Álcool isopropílico.pdf" → "Álcool isopropílico").
 *
 * O script nunca apaga nem sobrescreve o que você já escreveu: só acrescenta produtos
 * novos, completa foto/área faltando e avisa sobre PDFs que sumiram.
 * Depois, abra src/data/produtos.json e preencha fabricante, revisão, primeiros socorros etc.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PASTA_PDF = path.join(RAIZ, 'public/fichas/pdf');
const PASTA_FOTOS = path.join(RAIZ, 'public/fichas/fotos');
const ARQ_DADOS = path.join(RAIZ, 'src/data/produtos.json');
const AREAS = ['assistencia', 'engenharia'];

const slug = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const nomeBonito = (arquivo) => {
  const base = path.basename(arquivo, path.extname(arquivo)).replace(/^(fds|fispq)[\s_-]+/i, '').replace(/[_]+/g, ' ').trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
};

function listarPdfs() {
  const achados = [];
  if (!fs.existsSync(PASTA_PDF)) return achados;
  for (const item of fs.readdirSync(PASTA_PDF, { withFileTypes: true })) {
    if (item.isFile() && /\.pdf$/i.test(item.name)) {
      achados.push({ rel: `fichas/pdf/${item.name}`, arquivo: item.name, area: 'assistencia' });
    } else if (item.isDirectory() && AREAS.includes(item.name)) {
      for (const f of fs.readdirSync(path.join(PASTA_PDF, item.name))) {
        if (/\.pdf$/i.test(f)) achados.push({ rel: `fichas/pdf/${item.name}/${f}`, arquivo: f, area: item.name });
      }
    }
  }
  return achados;
}

function acharFoto(arquivoPdf) {
  if (!fs.existsSync(PASTA_FOTOS)) return undefined;
  const alvo = slug(path.basename(arquivoPdf, path.extname(arquivoPdf)));
  const f = fs.readdirSync(PASTA_FOTOS).find((x) => /\.(jpe?g|png|webp)$/i.test(x) && slug(path.basename(x, path.extname(x))) === alvo);
  return f ? `fichas/fotos/${f}` : undefined;
}

const produtos = JSON.parse(fs.readFileSync(ARQ_DADOS, 'utf8'));
const pdfs = listarPdfs();
let novos = 0;
let atualizados = 0;

for (const pdf of pdfs) {
  if (/^exemplo-fds\.pdf$/i.test(pdf.arquivo)) continue;
  const id = slug(nomeBonito(pdf.arquivo));
  let p = produtos.find((x) => x.pdf === pdf.rel) || produtos.find((x) => x.id === id);
  if (!p) {
    p = { id, nome: nomeBonito(pdf.arquivo), areas: [pdf.area], pdf: pdf.rel };
    const foto = acharFoto(pdf.arquivo);
    if (foto) p.foto = foto;
    produtos.push(p);
    novos++;
    console.log(`+ novo produto: ${p.nome}  (${pdf.rel})`);
    continue;
  }
  let mudou = false;
  if (!p.areas?.includes(pdf.area)) {
    p.areas = [...(p.areas || []), pdf.area];
    mudou = true;
  }
  if (!p.pdf || p.pdf === 'fichas/pdf/exemplo-fds.pdf') {
    p.pdf = pdf.rel;
    mudou = true;
  }
  if (!p.foto) {
    const foto = acharFoto(pdf.arquivo);
    if (foto) {
      p.foto = foto;
      mudou = true;
    }
  }
  if (mudou) {
    atualizados++;
    console.log(`~ atualizado: ${p.nome}`);
  }
}

for (const p of produtos) {
  if (p.pdf && !fs.existsSync(path.join(RAIZ, 'public', p.pdf))) console.warn(`! PDF não encontrado para "${p.nome}": public/${p.pdf}`);
  if (p.foto && !fs.existsSync(path.join(RAIZ, 'public', p.foto))) console.warn(`! Foto não encontrada para "${p.nome}": public/${p.foto}`);
}

produtos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
fs.writeFileSync(ARQ_DADOS, JSON.stringify(produtos, null, 2) + '\n');
console.log(`\nPronto: ${novos} novo(s), ${atualizados} atualizado(s), ${produtos.length} produto(s) no total.`);
if (produtos.some((p) => p.exemplo)) {
  console.log('Lembrete: remova os produtos com "exemplo": true de src/data/produtos.json quando cadastrar os reais.');
}
