import { AtualizacaoApp, Toast, useOnline } from './components/Avisos';
import { useRota } from './lib/router';
import { Documentos } from './screens/Documentos';
import { Emergencia } from './screens/Emergencia';
import { Inicio } from './screens/Inicio';
import { Produto } from './screens/Produto';
import { RegistroDetalhe } from './screens/RegistroDetalhe';
import { Registros } from './screens/Registros';

export function App() {
  const rota = useRota();
  const online = useOnline();

  let tela;
  switch (rota.tela) {
    case 'emergencia':
      tela = <Emergencia />;
      break;
    case 'documentos':
      tela = <Documentos />;
      break;
    case 'produto':
      tela = <Produto key={rota.id} id={rota.id} origem={rota.origem} />;
      break;
    case 'registros':
      tela = <Registros />;
      break;
    case 'registro':
      tela = <RegistroDetalhe key={rota.id} id={rota.id} />;
      break;
    default:
      tela = <Inicio />;
  }

  return (
    <div className="app">
      {!online && (
        <div className="sem-internet" role="status">
          Sem internet — fichas e telefones continuam funcionando
        </div>
      )}
      {tela}
      <Toast />
      <AtualizacaoApp />
    </div>
  );
}
