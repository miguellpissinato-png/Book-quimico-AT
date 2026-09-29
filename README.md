# Book Químico — Elsys

Versão digital do book químico da **Assistência Técnica** e da **Engenharia**.
Em caso de acidente com um produto químico, qualquer pessoa abre o app no celular, escolhe o
produto e mostra/envia a ficha de segurança (FDS) para o médico — sem procurar em pastas de papel.

É um **web app (PWA)**: abre pelo navegador, não precisa de Play Store/App Store e pode ser
"instalado" na tela inicial do celular. Depois do primeiro acesso, **funciona sem internet**.

## O que o app faz

| Tela | Para quê |
| --- | --- |
| **Início** | Dois caminhos: *Houve um acidente* (vermelho) e *Consultar documentos*. Botões fixos para ligar para o **SAMU (192)** e o **Disque-Intoxicação (0800 722 6001)**. |
| **Emergência** | Grade com as fotos das embalagens: toque no produto que causou o acidente. |
| **Ficha do produto** | Primeiros socorros, perigos, composição e telefone do fabricante. Botões **Abrir PDF**, **Baixar PDF** e **Enviar** (WhatsApp, e-mail…). A tela fica acesa enquanto é mostrada ao médico. |
| **Documentos** | Lista única com todas as fichas (Assistência Técnica e Engenharia juntas), com busca que ignora acentos e encontra por nome, marca ou fabricante. Botão para **salvar todas as fichas no celular** e abrir mesmo sem sinal. |
| **Registros** | Registro de ocorrências. Ver abaixo. |

### Registro de ocorrências

Numa emergência ninguém precisa preencher formulário. Assim que a pessoa escolhe o produto na
tela de emergência ou liga para o SAMU/Disque-Intoxicação pelo app, **uma ocorrência é aberta
automaticamente** e cada ação fica registrada com horário (ficha consultada, ligação, PDF aberto,
enviado…). Depois, com calma, a ocorrência é completada na aba **Registros** (quem registrou,
local, área, tipo de exposição, descrição, encaminhamento) e marcada como concluída.

- A aba mostra um contador vermelho com as ocorrências aguardando detalhes.
- **Exportar planilha** gera um CSV que abre direto no Excel.
- Registros nunca são apagados: os abertos por engano são marcados como *descartados*.

**Onde os registros ficam salvos?**

- **Sem configuração:** só no celular de quem registrou (funciona, mas cada pessoa vê só os seus).
- **Com Supabase (gratuito, recomendado):** todos os registros vão para um banco compartilhado e
  aparecem para toda a equipe. O registro é salvo primeiro no celular e enviado em segundo plano;
  se não houver internet, é enviado sozinho quando a conexão voltar. Veja
  [Ativar o registro compartilhado](#ativar-o-registro-compartilhado-supabase).

### Ajuste para qualquer celular

O app foi feito para abrir certo em qualquer tamanho de tela, sem rolagem dupla ou barras
escondidas (testado de 280 px — Galaxy Fold — até tablets, em pé e deitado):

- O app ocupa exatamente a **área visível** da tela, medida em tempo real
  (`src/lib/viewport.ts`). Quando a barra do navegador aparece/some ou o teclado abre, o layout se
  ajusta na hora — sem "pulos".
- A página nunca rola; só o conteúdo de cada tela rola. Os botões de ligar e o menu ficam sempre
  visíveis. Com o teclado aberto eles se escondem para sobrar espaço para a lista.
- Respeita o *notch* e a barra de gestos do iPhone/Android (`safe-area-inset`).
- A fonte base se adapta à largura do celular; campos com 16 px para o iPhone não dar zoom sozinho.
- O botão/gesto **voltar** do Android volta uma tela dentro do app, e a lista volta na mesma
  posição de rolagem.
- Em telas grandes (tablet/computador) o app fica centralizado com largura de celular.

## Cadastrar as fichas reais

Já cadastradas: álcool gel 70°, álcool isopropílico, fluxo de solda RMA (Alfatec) e os sprays Suvinil (fosco branco e multiverniz). Fichas marcadas com `"exemplo": true` mostram um aviso amarelo no app.
Para colocar as reais:

1. Copie os PDFs para `public/fichas/pdf/`:
   ```
   public/fichas/pdf/Álcool isopropílico.pdf
   public/fichas/pdf/Fluxo de solda.pdf
   ```
2. (Opcional, mas ajuda muito na emergência) Coloque a **foto da embalagem** em
   `public/fichas/fotos/` com o **mesmo nome** do PDF (`Álcool isopropílico.jpg`).
   Fotos quadradas ou 4:3, com até ~200 KB cada, deixam o app rápido.
3. Rode:
   ```bash
   npm run fichas
   ```
   Cada PDF novo vira um produto em `src/data/produtos.json`.
4. Abra `src/data/produtos.json`, apague os produtos de exemplo e complete os campos de cada
   produto copiando da FDS:

```jsonc
{
  "id": "alcool-isopropilico",           // gerado automaticamente
  "nome": "Álcool isopropílico",
  "sinonimos": ["IPA", "isopropanol"],   // outros nomes usados na busca
  "fabricante": "Nome do fabricante",
  "revisao": "2024-03-01",               // data de revisão da FDS (AAAA-MM-DD)
  "pdf": "fichas/pdf/Álcool isopropílico.pdf",
  "foto": "fichas/fotos/Álcool isopropílico.jpg",
  "telefoneEmergencia": "0800 000 0000", // seção 1 da FDS (vira botão de ligar)
  "uso": "Limpeza de placas.",
  "perigos": ["Líquido e vapores inflamáveis", "Provoca irritação ocular grave"], // seção 2
  "primeirosSocorros": {                 // seção 4
    "inalacao": "…",
    "pele": "…",
    "olhos": "…",
    "ingestao": "…",
    "notasMedico": "…"
  },
  "composicao": "Propan-2-ol (CAS 67-63-0) > 99%", // seção 3
  "destaque": true                       // aparece primeiro na tela de emergência
}
```

Só `id` e `nome` são obrigatórios — o que não for preenchido simplesmente não aparece.
`npm test` confere se o arquivo está correto (ids repetidos, PDFs/fotos que não existem etc.).

> ⚠️ Os textos de primeiros socorros devem ser **copiados da FDS oficial** do fabricante. Revise
> com o SESMT/segurança do trabalho antes de liberar o app.

## Rodar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev      # abre em http://localhost:5173 (e no celular, pelo IP mostrado no terminal)
npm test         # testes
npm run build    # gera a versão final em dist/
```

## Publicar (grátis)

O app é só um conjunto de arquivos estáticos, então pode ser hospedado de graça:

**GitHub Pages** (repositório público — é o que usamos)
1. No GitHub: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
2. A cada mudança na branch `main`, o workflow `.github/workflows/deploy.yml` testa, gera e
   publica sozinho (acompanhe na aba *Actions*). Também dá para rodar manualmente em
   *Actions → Publicar no GitHub Pages → Run workflow*.
3. O endereço fica `https://miguellpissinato-png.github.io/Book-quimico-AT/`.

**Netlify / Cloudflare Pages** (funcionam com repositório privado no plano gratuito)
- Conecte o repositório; comando de build `npm run build`, pasta `dist` (o `netlify.toml` já
  configura o Netlify).

Depois de publicado, gere um **QR code** do endereço e cole no book físico / na bancada.
No celular, "Adicionar à tela inicial" (Chrome: menu ⋮; iPhone: botão Compartilhar) deixa o app
com ícone próprio e em tela cheia.

Atualizações: quando uma versão nova é publicada, o app mostra *"Nova versão disponível ·
Atualizar"* — ele nunca recarrega sozinho no meio de uma emergência.

## Ativar o registro compartilhado (Supabase)

1. Crie uma conta e um projeto gratuito em [supabase.com](https://supabase.com).
2. No projeto: *SQL Editor* → cole o conteúdo de `supabase/migrations/001_ocorrencias.sql` → *Run*.
3. Em *Project Settings → API*, copie a **Project URL** e a chave **anon / public**.
4. Configure as variáveis:
   - Local: copie `.env.example` para `.env` e preencha.
   - GitHub Pages: *Settings → Secrets and variables → Actions → **Variables*** →
     `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
   - Netlify/Cloudflare: nas variáveis de ambiente do site.
5. Publique de novo. Na aba Registros aparece *"Compartilhados com a equipe"*.

**Privacidade (LGPD):** a chave *anon* fica dentro do app, então quem tiver o endereço do app
consegue ler os registros. Por isso o formulário pede o mínimo (a pessoa atendida é opcional e
pode ser só a matrícula). Se os registros forem conter dados de saúde identificáveis, o próximo
passo é adicionar login (Supabase Auth) e restringir a leitura na política de segurança.

## Estrutura

```
public/fichas/pdf/        PDFs das FDS
public/fichas/fotos/      Fotos das embalagens
src/data/produtos.json    Cadastro das fichas  ← o arquivo que você edita
src/data/contatos.ts      Telefones de emergência (SAMU, Disque-Intoxicação)
src/screens/              Telas (Início, Emergência, Produto, Documentos, Registros)
src/lib/viewport.ts       Ajuste de tela para cada celular
src/lib/router.ts         Navegação (#/…) com botão voltar do celular
src/lib/ocorrencias/      Registro de ocorrências (celular + Supabase)
src/lib/fichas.ts         Abrir/enviar PDF e salvar fichas para uso sem internet
scripts/sincronizar-fichas.mjs   npm run fichas
supabase/migrations/      Tabela do registro compartilhado
```

Design: protótipo do Claude Design (cores Elsys, fonte Plus Jakarta Sans), convertido para
React + Vite + TypeScript, PWA com `vite-plugin-pwa`.
