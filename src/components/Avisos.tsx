import { useEffect, useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { avisar, fecharAviso, useAviso } from '../lib/aviso';

/** Mensagem flutuante (toast). */
export function Toast() {
  const aviso = useAviso();
  if (!aviso) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={aviso.id}>
      <span>{aviso.texto}</span>
      {aviso.acao ? (
        <button
          type="button"
          onClick={() => {
            fecharAviso();
            aviso.acao!.executar();
          }}
        >
          {aviso.acao.rotulo}
        </button>
      ) : (
        aviso.fixo && (
          <button type="button" onClick={fecharAviso}>
            OK
          </button>
        )
      )}
    </div>
  );
}

/**
 * Service worker: deixa o app funcionando sem internet e avisa quando há versão nova.
 * A atualização nunca é forçada — a pessoa toca em "Atualizar" quando puder.
 */
export function AtualizacaoApp() {
  const {
    offlineReady: [pronto, setPronto],
    needRefresh: [temNova],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      // Procura versão nova a cada hora enquanto o app estiver aberto.
      if (registro) setInterval(() => void registro.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (pronto) {
      avisar('App pronto para funcionar sem internet.');
      setPronto(false);
    }
  }, [pronto, setPronto]);

  useEffect(() => {
    if (temNova) {
      avisar('Nova versão do Book Químico disponível.', {
        fixo: true,
        acao: { rotulo: 'Atualizar', executar: () => void updateServiceWorker(true) },
      });
    }
  }, [temNova, updateServiceWorker]);

  return null;
}

function assinarConexao(f: () => void) {
  window.addEventListener('online', f);
  window.addEventListener('offline', f);
  return () => {
    window.removeEventListener('online', f);
    window.removeEventListener('offline', f);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(assinarConexao, () => navigator.onLine);
}
