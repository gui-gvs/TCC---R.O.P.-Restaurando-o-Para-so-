import { useEffect, useState } from 'react';
import './botaoTema.scss';

// O modo escuro continua sendo o padrão do site original.
const CHAVE = 'rop-tema';

function temaInicial() {
  return document.documentElement.dataset.ropTheme === 'light';
}

export default function BotaoTema() {
  const [claro, setClaro] = useState(temaInicial);

  useEffect(() => {
    function sincronizar(evento) {
      if (evento.key === CHAVE) {
        const ativarClaro = evento.newValue === 'claro';
        document.documentElement.dataset.ropTheme = ativarClaro ? 'light' : 'dark';
        setClaro(ativarClaro);
      }
    }
    window.addEventListener('storage', sincronizar);
    return () => window.removeEventListener('storage', sincronizar);
  }, []);

  function alternarTema() {
    const ativarClaro = !claro;
    document.documentElement.dataset.ropTheme = ativarClaro ? 'light' : 'dark';
    setClaro(ativarClaro);
    try {
      localStorage.setItem(CHAVE, ativarClaro ? 'claro' : 'escuro');
    } catch {
      // Permite alternar mesmo quando o navegador bloqueia armazenamento.
    }
  }

  return (
    <button
      type="button"
      className={`comp-tema ${claro ? 'comp-tema--claro' : 'comp-tema--escuro'}`}
      role="switch"
      aria-label="Modo claro"
      aria-checked={claro}
      title={claro ? 'Mudar para o modo escuro' : 'Mudar para o modo claro'}
      onClick={alternarTema}
    >
      <span className="comp-tema__indicador" aria-hidden="true">
        {claro ? '☀' : '☾'}
      </span>
    </button>
  );
}
