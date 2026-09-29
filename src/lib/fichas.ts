import { PRODUTOS, urlPublica, type Produto } from '../data/produtos';

/** Mesmo nome de cache usado pelo service worker (vite.config.ts → runtimeCaching). */
const CACHE_PDF = 'fichas-pdf';

export function urlPdf(p: Produto): string | undefined {
  return p.pdf ? new URL(urlPublica(p.pdf), window.location.href).href : undefined;
}

/**
 * Nome sugerido ao salvar o PDF no celular. Sem acentos e símbolos (ex.: "°"): alguns
 * navegadores descartam o nome inteiro e salvam como "download" se houver um deles.
 */
export function nomeArquivo(p: Produto): string {
  const nome = p.nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ()\-.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `FDS - ${nome}.pdf`;
}

export type ResultadoEnvio = 'arquivo' | 'link' | 'copiado' | 'cancelado';

const arquivosProntos = new Map<string, File>();

/**
 * Carrega o PDF em memória assim que a ficha é aberta. Assim, ao tocar em "Enviar",
 * o menu de compartilhar abre na hora — o iPhone recusa o compartilhamento se houver
 * espera (download) entre o toque e a abertura do menu.
 */
export async function prepararArquivo(p: Produto): Promise<void> {
  const url = urlPdf(p);
  if (!url || arquivosProntos.has(p.id) || !navigator.canShare) return;
  try {
    const resp = await fetch(url);
    if (resp.ok) arquivosProntos.set(p.id, new File([await resp.blob()], nomeArquivo(p), { type: 'application/pdf' }));
  } catch {
    /* sem internet e PDF não salvo: o envio usará o link */
  }
}

/**
 * Abre o menu "Compartilhar" do celular (WhatsApp, e-mail...) com o PDF anexado.
 * Se o navegador não permitir anexar arquivo, envia o link; em último caso copia o link.
 */
export async function compartilharPdf(p: Produto): Promise<ResultadoEnvio> {
  const url = urlPdf(p);
  const texto = `Ficha de segurança (FDS) — ${p.nome}${p.fabricante ? ` · ${p.fabricante}` : ''}`;
  const arquivo = arquivosProntos.get(p.id);
  try {
    if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: texto, text: texto });
      return 'arquivo';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelado';
  }
  try {
    if (navigator.share) {
      await navigator.share({ title: texto, text: texto, url: url || window.location.href });
      return 'link';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelado';
  }
  try {
    await navigator.clipboard.writeText(`${texto}\n${url || window.location.href}`);
    return 'copiado';
  } catch {
    return 'cancelado';
  }
}

// ---------- Fichas disponíveis sem internet ----------

function todasAsUrls(): string[] {
  return [...new Set(PRODUTOS.map(urlPdf).filter((u): u is string => !!u))];
}

export async function contarPdfsOffline(): Promise<{ salvos: number; total: number }> {
  const urls = todasAsUrls();
  if (!('caches' in window)) return { salvos: 0, total: urls.length };
  const cache = await caches.open(CACHE_PDF);
  let salvos = 0;
  for (const u of urls) if (await cache.match(u)) salvos++;
  return { salvos, total: urls.length };
}

/** Guarda todos os PDFs no celular, para abrir mesmo sem sinal. */
export async function salvarTodosOffline(progresso: (feito: number, total: number) => void): Promise<number> {
  const urls = todasAsUrls();
  const cache = await caches.open(CACHE_PDF);
  let feito = 0;
  let falhas = 0;
  // 4 downloads em paralelo: rápido sem travar a rede do celular.
  const fila = [...urls];
  const trabalhador = async () => {
    for (let u = fila.shift(); u; u = fila.shift()) {
      try {
        if (!(await cache.match(u))) {
          const resp = await fetch(u, { cache: 'no-store' });
          if (!resp.ok) throw new Error(String(resp.status));
          await cache.put(u, resp);
        }
      } catch {
        falhas++;
      }
      progresso(++feito, urls.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, trabalhador));
  return falhas;
}
