import { useEffect, useRef, useState } from 'react';
import { ANIMAIS_TESTE, GRUPOS, normalizarTexto } from '../especies/dadosEspecies.js';
import { coordenadasDaPosicao, formatarLocalizacao } from '../../utils/denuncias.js';

export const LOCALIZACAO_INICIAL = { modo: 'bairro', bairro: '', rua: '', coordenadas: null };

export function CampoLocalizacao({ valor, onChange }) {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');
  const pedido = useRef(0);

  useEffect(() => () => { pedido.current += 1; }, []);

  function alterarModo(modo) {
    pedido.current += 1;
    setBuscando(false);
    setErro('');
    onChange({ ...valor, modo, coordenadas: null });
  }

  function usarGPS() {
    if (!navigator.geolocation) {
      setErro('O GPS não está disponível neste navegador. Você pode informar o bairro.');
      return;
    }
    const id = ++pedido.current;
    const modo = valor.modo;
    setBuscando(true);
    setErro('');
    onChange({ ...valor, coordenadas: null });
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        if (id !== pedido.current) return;
        onChange({ ...valor, coordenadas: coordenadasDaPosicao(posicao, modo) });
        setBuscando(false);
      },
      (falha) => {
        if (id !== pedido.current) return;
        setBuscando(false);
        setErro(falha.code === 1 ? 'Permissão de localização negada. Autorize nas configurações do navegador ou informe o bairro.' : 'Não foi possível obter sua localização. Tente novamente ou informe o bairro.');
      },
      { enableHighAccuracy: modo === 'exata', timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <fieldset className="denuncia-campo-extra">
      <legend>Localidade *</legend>
      <div className="denuncia-modos">
        {[['bairro', 'Bairro'], ['aproximada', 'Aproximada'], ['exata', 'GPS exato']].map(([modo, texto]) => (
          <label key={modo} className={valor.modo === modo ? 'escolhido' : ''}>
            <input type="radio" name="modo-localizacao" value={modo} checked={valor.modo === modo} onChange={() => alterarModo(modo)} />
            {texto}
          </label>
        ))}
      </div>
      {valor.modo === 'bairro' ? (
        <div className="denuncia-endereco">
          <label>Bairro ou local de referência<input required maxLength={100} value={valor.bairro} onChange={(e) => onChange({ ...valor, bairro: e.target.value })} placeholder="Ex.: Parelheiros" /></label>
          <label>Nome da rua (se souber)<input maxLength={150} value={valor.rua} onChange={(e) => onChange({ ...valor, rua: e.target.value })} placeholder="Ex.: Rua das Flores" /></label>
        </div>
      ) : (
        <div className="denuncia-gps">
          <p>{valor.modo === 'aproximada' ? 'Registra apenas uma região arredondada, sem salvar sua posição exata.' : 'Usa a posição mais precisa disponível no dispositivo. A precisão depende do GPS.'}</p>
          <small>Use apenas se estiver no local da ocorrência. O navegador pedirá sua autorização; as coordenadas ficam nesta sessão, sem envio a servidores do R.O.P.</small>
          <button type="button" className="denuncia-btn secundaria" disabled={buscando} onClick={usarGPS}>{buscando ? 'Obtendo localização…' : valor.coordenadas ? 'Atualizar minha localização' : 'Usar minha localização'}</button>
          {valor.coordenadas && <div className="denuncia-local-confirmado" role="status"><strong>{formatarLocalizacao(valor)}</strong><small>{valor.modo === 'aproximada' ? 'Área aproximada, com margem de pelo menos 1,5 km.' : `Precisão estimada pelo dispositivo: ${valor.coordenadas.precisao} m.`}</small><button type="button" className="denuncia-link" onClick={() => onChange({ ...valor, coordenadas: null })}>Remover localização</button></div>}
          {erro && <p className="denuncia-feedback erro" role="alert">{erro}</p>}
          <small>Para não compartilhar sua posição, escolha Bairro e informe uma referência fictícia.</small>
        </div>
      )}
    </fieldset>
  );
}

export function CampoEspecie({ nome, id, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('Todos');
  const escolhida = ANIMAIS_TESTE.find((animal) => animal.id === id);
  const termo = normalizarTexto(busca);
  const resultados = ANIMAIS_TESTE.filter((animal) => (grupo === 'Todos' || animal.grupo === grupo) &&
    (!termo || normalizarTexto(`${animal.nome_popular} ${animal.nome_cientifico}`).includes(termo)));

  function selecionar(animal) {
    onChange(animal ? { especie: animal.nome_popular, especieId: animal.id, especieImagem: animal.imagem } : { especie: '', especieId: '', especieImagem: '' });
    setAberto(false);
  }

  return (
    <fieldset className="denuncia-campo-extra">
      <legend>Espécie do animal (opcional)</legend>
      {escolhida ? (
        <div className="denuncia-especie-selecionada">
          <img src={escolhida.imagem} alt={escolhida.nome_popular} />
          <div><strong>{escolhida.nome_popular}</strong><small>{escolhida.nome_cientifico}</small></div>
          <button type="button" className="denuncia-link" onClick={() => selecionar(null)}>Remover</button>
        </div>
      ) : <input aria-label="Nome da espécie" maxLength={100} value={nome} onChange={(e) => onChange({ especie: e.target.value, especieId: '', especieImagem: '' })} placeholder="Digite o nome, se souber" />}
      <button type="button" className="denuncia-btn secundaria" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar catálogo de espécies' : escolhida ? 'Trocar espécie' : 'Escolher espécie por foto'}</button>
      {!escolhida && <small>Não sabe o nome? Compare as imagens do catálogo ou deixe o campo em branco.</small>}
      {aberto && (
        <div className="denuncia-catalogo">
          <div className="denuncia-filtros-especies">
            <label>Pesquisar espécie<input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome popular ou científico" /></label>
            <label>Grupo<select value={grupo} onChange={(e) => setGrupo(e.target.value)}>{GRUPOS.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <small>{resultados.length} espécies encontradas</small>
          <div className="denuncia-lista-especies" role="group" aria-label="Espécies do catálogo">
            {resultados.map((animal) => <button type="button" key={animal.id} aria-pressed={animal.id === id} className="denuncia-especie-opcao" onClick={() => selecionar(animal)}>
              <img src={animal.imagem} alt="" loading="lazy" />
              <span><strong>{animal.nome_popular}</strong><small>{animal.nome_cientifico}</small><small>{animal.grupo}</small></span>
            </button>)}
            {!resultados.length && <p>Nenhuma espécie encontrada. Tente outro grupo ou nome.</p>}
          </div>
          <button type="button" className="denuncia-link" onClick={() => selecionar(null)}>Não consegui identificar o animal</button>
          <small>As imagens são referências para identificação; não substituem a foto da ocorrência.</small>
        </div>
      )}
    </fieldset>
  );
}
