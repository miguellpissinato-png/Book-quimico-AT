/**
 * Ajuste de tela para qualquer celular.
 *
 * Problema: em navegadores de celular, "100vh" não é a altura visível — a barra de
 * endereço aparece/some, o teclado cobre parte da tela e o iPhone "empurra" a página
 * quando um campo recebe foco. Isso causa rolagem dupla, rodapé escondido e saltos.
 *
 * Solução: o app ocupa exatamente a área VISÍVEL da tela, medida em tempo real com
 * a API visualViewport, e só as áreas de conteúdo internas rolam. As medidas viram
 * variáveis CSS:
 *   --app-height  altura visível (encolhe quando o teclado abre)
 *   --app-top     deslocamento vertical que o iOS aplica ao focar um campo
 * E atributos no <html>:
 *   data-teclado="aberto"  quando o teclado virtual está na tela
 *   data-standalone        quando aberto como app instalado (tela inicial)
 */
export function iniciarAjusteDeTela(): () => void {
  const root = document.documentElement;
  const vv = window.visualViewport;
  let alturaSemTeclado = window.innerHeight;
  let quadro = 0;

  const medir = () => {
    quadro = 0;
    // Com zoom de pinça ativo o visualViewport encolhe; nesse caso usamos a
    // altura do layout para não "encolher" o app junto com o zoom.
    const semZoom = !vv || Math.abs(vv.scale - 1) < 0.01;
    const altura = vv && semZoom ? vv.height : window.innerHeight;
    const topo = vv && semZoom ? vv.offsetTop : 0;

    const campoFocado = isCampoDeTexto(document.activeElement);
    if (!campoFocado) alturaSemTeclado = Math.max(window.innerHeight, altura);
    // Teclado aberto = um campo está focado e a área visível perdeu mais de 20%.
    const tecladoAberto = campoFocado && altura < alturaSemTeclado * 0.8;

    root.style.setProperty('--app-height', `${Math.round(altura)}px`);
    root.style.setProperty('--app-top', `${Math.round(topo)}px`);
    if (tecladoAberto) root.dataset.teclado = 'aberto';
    else delete root.dataset.teclado;

    // O iOS às vezes rola o documento inteiro ao focar um campo. Como o app já
    // se posiciona pela área visível, voltamos o documento para o topo.
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };

  const agendar = () => {
    if (!quadro) quadro = requestAnimationFrame(medir);
  };
  // Após girar o celular, alguns navegadores só informam o tamanho final depois
  // de alguns milissegundos.
  const aposGirar = () => {
    agendar();
    setTimeout(agendar, 250);
    setTimeout(agendar, 600);
  };

  medir();
  vv?.addEventListener('resize', agendar);
  vv?.addEventListener('scroll', agendar);
  window.addEventListener('resize', agendar);
  window.addEventListener('orientationchange', aposGirar);
  document.addEventListener('focusin', agendar);
  document.addEventListener('focusout', aposGirar);

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  root.toggleAttribute('data-standalone', standalone);

  return () => {
    vv?.removeEventListener('resize', agendar);
    vv?.removeEventListener('scroll', agendar);
    window.removeEventListener('resize', agendar);
    window.removeEventListener('orientationchange', aposGirar);
    document.removeEventListener('focusin', agendar);
    document.removeEventListener('focusout', aposGirar);
  };
}

function isCampoDeTexto(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color'].includes(el.type);
  }
  return (el as HTMLElement).isContentEditable === true;
}
