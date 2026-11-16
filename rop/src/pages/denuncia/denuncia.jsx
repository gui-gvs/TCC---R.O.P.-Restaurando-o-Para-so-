import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Cabecalho from '../../componentes/cabecalho/cabecalho.jsx';
import Rodape from '../../componentes/rodape/rodape.jsx';
import {
  ETAPAS, ENCERRAMENTOS, statusChamado, finalizado, creditoChamado,
  lerDenuncias, salvarDenuncias, resumoDenuncias, criarChamado, avancarChamado, formatarLocalizacao
} from '../../utils/denuncias.js';
import { CampoLocalizacao, CampoEspecie, LOCALIZACAO_INICIAL } from './camposDenuncia.jsx';
import './denuncia.scss';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5050').replace(/\/+$/, '');
const INICIAL = { especie: '', especieId: '', especieImagem: '', localizacao: LOCALIZACAO_INICIAL, detalhesLocal: '', condicao: '', descricao: '', foto: '', acompanhar: true };
const CONDICOES = ['Ferido', 'Debilitado', 'Preso ou em risco', 'Filhote aparentemente abandonado', 'Suspeita de maus-tratos', 'Outro / Não identificado'];
const formatarData = (valor) => new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

async function prepararFoto(arquivo) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
  }
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
      img.src = url;
    });
    const escala = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível preparar a imagem.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .75);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function LinhaDoTempo({ chamado, atualizar }) {
  const [encerramento, setEncerramento] = useState('');
  const saldo = creditoChamado(chamado);
  return (
    <article className="denuncia-card denuncia-detalhe" aria-labelledby="denuncia-acompanhamento-titulo">
      <div className="denuncia-card-topo">
        <div><span className="denuncia-eyebrow">{chamado.id}</span><h2 id="denuncia-acompanhamento-titulo">Acompanhe seu animal</h2></div>
        <span className="denuncia-status">{statusChamado(chamado)}</span>
      </div>
      <div className="denuncia-animal">
        {(chamado.foto || chamado.especieImagem) && <img src={chamado.foto || chamado.especieImagem} alt={chamado.foto ? "Foto da ocorrência" : "Imagem de referência da espécie"} />}
        <div><h3>{chamado.especie || 'Espécie não identificada'}</h3><p>{chamado.local}</p>{chamado.detalhesLocal && <p><strong>Referências do local:</strong> {chamado.detalhesLocal}</p>}{!chamado.foto && chamado.especieImagem && <small>Imagem de referência do catálogo, não da ocorrência.</small>}<small>{chamado.condicao} · {formatarData(chamado.criadoEm)}</small><p>{chamado.descricao}</p></div>
      </div>
      <p className="denuncia-credito-linha">Crédito deste chamado: <strong>{saldo > 0 ? '+' : ''}{saldo}</strong> · {chamado.validacao === 'confirmada' ? 'Confirmada (simulação)' : chamado.validacao === 'falsa' ? 'Fraude intencional (simulação)' : chamado.validacao === 'inconclusiva' ? 'Inconclusiva, sem penalidade' : 'Aguardando validação'}</p>
      <ol className="denuncia-linha">
        {ETAPAS.map((estado, i) => {
          const evento = chamado.historico.find((item) => item.estado === estado);
          const atual = !chamado.encerramento && i === chamado.etapa;
          return <li key={estado} className={atual ? 'atual' : evento ? 'feito' : ''} aria-current={atual ? 'step' : undefined}>
            <span className="denuncia-ponto" aria-hidden="true">{evento && !atual ? '✓' : i + 1}</span>
            <div><strong>{estado}</strong>{evento && <small>{formatarData(evento.data)}</small>}</div>
          </li>;
        })}
        {chamado.encerramento && <li className="atual"><span className="denuncia-ponto">!</span><div><strong>{chamado.encerramento}</strong><small>{formatarData(chamado.historico.at(-1).data)}</small></div></li>}
      </ol>
      {!finalizado(chamado) && (
        <div className="denuncia-simulador">
          <strong>Simular andamento do resgate</strong>
          <p>Controle de apresentação do TCC. Não representa uma equipe real ou uma validação oficial.</p>
          <button className="denuncia-btn" type="button" onClick={() => { setEncerramento(''); atualizar(chamado.id); }}>Avançar para: {ETAPAS[chamado.etapa + 1]}</button>
          <label>Simular encerramento alternativo
            <select value={encerramento} onChange={(e) => setEncerramento(e.target.value)}>
              <option value="">Escolha um resultado</option>
              {ENCERRAMENTOS.filter((estado) => estado !== 'Denúncia falsa intencional' || chamado.validacao !== 'confirmada').map((estado) => <option key={estado}>{estado}</option>)}
            </select>
          </label>
          {encerramento === 'Denúncia falsa intencional' && <p>Somente uma fraude comprovada e intencional deve causar penalização. Casos inconclusivos não descontam créditos.</p>}
          <button type="button" className="denuncia-btn secundaria" disabled={!encerramento} onClick={() => atualizar(chamado.id, encerramento)}>Simular encerramento</button>
        </div>
      )}
    </article>
  );
}

export default function Denuncia() {
  const location = useLocation();
  const [usuario, setUsuario] = useState(null);
  const [autenticando, setAutenticando] = useState(true);
  const [erroSessao, setErroSessao] = useState('');
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(INICIAL);
  const [aba, setAba] = useState('nova');
  const [selecionado, setSelecionado] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [preparando, setPreparando] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('aba') === 'historico') setAba('historico');
  }, [location.search]);

  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      const token = sessionStorage.getItem('rop_token');
      setUsuario(null);
      setLista([]);
      setErroSessao('');
      if (!token) { setAutenticando(false); return; }
      setAutenticando(true);
      try {
        const resposta = await fetch(`${API_URL}/cadastro/me`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (resposta.status === 401) return;
        if (!resposta.ok) throw new Error('Não foi possível verificar sua conta. Tente novamente.');
        const dados = await resposta.json();
        if (dados.id_usuario == null) throw new Error('Não foi possível identificar sua conta.');
        if (!controller.signal.aborted && sessionStorage.getItem('rop_token') === token) {
          setUsuario(dados);
          setLista(lerDenuncias(dados.id_usuario));
        }
      } catch (e) {
        if (!controller.signal.aborted) setErroSessao(e.message);
      } finally {
        if (!controller.signal.aborted) setAutenticando(false);
      }
    }
    carregar();
    window.addEventListener('rop:login', carregar);
    return () => { controller.abort(); window.removeEventListener('rop:login', carregar); };
  }, []);

  const resumo = resumoDenuncias(lista);
  const chamado = lista.find((item) => item.id === selecionado);
  const resultados = lista.filter((item) => (filtro === 'todos' || (filtro === 'ativos' && !finalizado(item)) || (filtro === 'encerrados' && finalizado(item)) || statusChamado(item) === filtro) &&
    `${item.id} ${item.especie} ${item.local} ${item.detalhesLocal || ''}`.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')));

  function persistir(proxima) {
    if (!usuario || !sessionStorage.getItem('rop_token')) return false;
    try {
      salvarDenuncias(usuario.id_usuario, proxima);
      setLista(proxima);
      setErro('');
      return true;
    } catch {
      setErro('O armazenamento da sessão está cheio ou indisponível. Não foi possível salvar.');
      return false;
    }
  }

  function registrar(e) {
    e.preventDefault();
    const local = formatarLocalizacao(form.localizacao);
    if (!local || !form.descricao.trim() || !form.condicao) {
      setErro('Preencha a localidade, o estado do animal e a descrição.'); return;
    }
    const localizacao = form.localizacao.modo === 'bairro'
      ? { modo: 'bairro', bairro: form.localizacao.bairro.trim(), rua: form.localizacao.rua.trim() }
      : { modo: form.localizacao.modo, coordenadas: form.localizacao.coordenadas };
    const novo = criarChamado({ ...form, local, localizacao, detalhesLocal: form.detalhesLocal.trim(), especie: form.especie.trim(), descricao: form.descricao.trim() });
    if (persistir([novo, ...lista])) {
      setForm(INICIAL);
      setSelecionado(form.acompanhar ? novo.id : '');
      setAba(form.acompanhar ? 'acompanhar' : 'historico');
      setAviso(`Chamado demonstrativo ${novo.id} registrado neste navegador.`);
    }
  }

  function exemplo() {
    const novo = criarChamado({ especie: 'Tucano-toco', local: 'Rua das Flores, Área fictícia, São Paulo', detalhesLocal: 'Perto de um campo, na esquina com a rua do Lago (exemplo fictício).', condicao: 'Ferido', descricao: 'Exemplo acadêmico de animal com dificuldade para voar.', foto: '/assets/img/pages/especies/aves/tucano-toco.webp', acompanhar: true });
    if (persistir([novo, ...lista])) { setSelecionado(novo.id); setAba('acompanhar'); setAviso('Exemplo fictício criado. Avance as etapas para demonstrar o acompanhamento.'); }
  }

  function atualizar(id, encerramento) {
    persistir(lista.map((item) => item.id === id ? avancarChamado(item, encerramento) : item));
  }

  async function escolherFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setPreparando(true);
    setErro('');
    try {
      const foto = await prepararFoto(arquivo);
      setForm((atual) => ({ ...atual, foto }));
    } catch (error) { setErro(error.message); }
    finally { setPreparando(false); e.target.value = ''; }
  }

  function abrir(item) { setSelecionado(item.id); setAba('acompanhar'); }
  function campo(nome, valor) { setForm((atual) => ({ ...atual, [nome]: valor })); }

  return (
    <div className="denuncia-pagina">
      <Cabecalho />
      <main className="denuncia-main">
        <div className="denuncia-container">
          <header className="denuncia-hero">
            <div><span className="denuncia-eyebrow">PROTEÇÃO DA FAUNA / R.O.P.</span><h1>Denunciar é proteger.</h1><p>Registre uma situação de risco, acompanhe o chamado e conheça cada etapa do cuidado com o animal.</p><Link className="denuncia-link" to="/orientacoes">Como fazer uma denúncia segura →</Link></div>
            <img src="/assets/img/pages/especies/aves/tucano-toco.webp" alt="Tucano-toco na natureza" />
          </header>
          <aside className="denuncia-alerta"><strong>Projeto acadêmico · modo demonstrativo</strong><p>O R.O.P. não realiza resgates nem encaminha denúncias. Use dados e fotos fictícios na apresentação. Se testar o GPS, a localização ficará apenas nesta sessão. Em uma ocorrência real, mantenha distância e procure os órgãos ambientais ou serviços de resgate autorizados. Os dados desta demonstração ficam na sessão deste navegador.</p></aside>
          {autenticando ? <p role="status">Verificando sua conta…</p> : !usuario ? (
            <section className="denuncia-card denuncia-login"><h2>Entre para registrar e acompanhar</h2><p>As denúncias e os créditos demonstrativos ficam vinculados à sua conta nesta sessão.</p>{erroSessao && <p role="alert">{erroSessao}</p>}<Link className="denuncia-btn" to="/" state={{ retornoDenuncia: true }}>Fazer login</Link> <Link className="denuncia-link" to="/registro">Criar conta</Link></section>
          ) : <>
            <section className="denuncia-resumo" aria-label="Resumo da confiabilidade">
              <div><small>Créditos de confiabilidade</small><strong>{resumo.creditos}</strong><span>Saldo demonstrativo</span></div>
              <div><small>Meus chamados</small><strong>{resumo.total}</strong><span>{resumo.ativos} em andamento</span></div>
              <div><small>Confirmadas</small><strong>{resumo.confirmadas}</strong><span>+10 por confirmação</span></div>
              <div><small>Falsas intencionais</small><strong>{resumo.falsas}</strong><span>−25 por fraude comprovada</span></div>
            </section>
            <nav className="denuncia-abas" aria-label="Área de denúncias">
              {[['nova', 'Nova denúncia'], ['historico', 'Histórico de denúncias'], ['acompanhar', 'Acompanhe seu animal']].map(([id, titulo]) => <button key={id} type="button" aria-pressed={aba === id} onClick={() => { setAba(id); setAviso(''); setErro(''); }}>{titulo}</button>)}
            </nav>
            {aviso && <p className="denuncia-feedback" role="status">{aviso}</p>}
            {erro && <p className="denuncia-feedback erro" role="alert">{erro}</p>}
            {aba === 'nova' && <div className="denuncia-grid">
              <form className="denuncia-card denuncia-form" onSubmit={registrar}>
                <h2>Novo chamado</h2><p>Preencha os dados da ocorrência. Não se aproxime do animal para obter fotos.</p>
                <CampoLocalizacao valor={form.localizacao} onChange={(valor) => campo('localizacao', valor)} />
                <label>Detalhes do local (opcional)<textarea maxLength={500} rows={3} value={form.detalhesLocal} onChange={(e) => campo('detalhesLocal', e.target.value)} placeholder="Ex.: Na esquina com a Rua do Lago, perto de um campo de futebol ou ao lado de uma ponte." /><small>{form.localizacao.modo === 'aproximada' ? 'Informe apenas referências gerais se quiser preservar a localização exata.' : 'Descreva pontos de referência que ajudem a encontrar a ocorrência.'}</small></label>
                <CampoEspecie nome={form.especie} id={form.especieId} onChange={(campos) => setForm((atual) => ({ ...atual, ...campos }))} />
                <label>Estado do animal *<select required value={form.condicao} onChange={(e) => campo('condicao', e.target.value)}><option value="">Selecione a condição</option>{CONDICOES.map((condicao) => <option key={condicao}>{condicao}</option>)}</select></label>
                <label>Descrição da ocorrência *<textarea required maxLength={1200} rows={4} value={form.descricao} onChange={(e) => campo('descricao', e.target.value)} placeholder="Descreva o que observou." /></label>
                <label>Foto do animal (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={escolherFoto} disabled={preparando} /><small>JPG, PNG ou WebP · até 5 MB</small></label>
                {form.foto && <div className="denuncia-preview"><img src={form.foto} alt="Prévia do animal" /><button type="button" className="denuncia-btn secundaria" onClick={() => campo('foto', '')}>Remover foto</button></div>}
                <label className="denuncia-check"><input type="checkbox" checked={form.acompanhar} onChange={(e) => campo('acompanhar', e.target.checked)} /> Acompanhar este chamado após o registro</label>
                <button className="denuncia-btn" type="submit" disabled={preparando}>{preparando ? 'Preparando foto…' : 'Registrar denúncia demonstrativa →'}</button>
              </form>
              <aside className="denuncia-card denuncia-ajuda"><span className="denuncia-eyebrow">ANTES DE DENUNCIAR</span><h2>Cuide com responsabilidade.</h2><ol><li>Observe de uma distância segura.</li><li>Identifique a localização e descreva a situação.</li><li>Fotografe apenas se for seguro.</li><li>Para ocorrências reais, entre em contato com o serviço autorizado.</li></ol><Link to="/orientacoes" className="denuncia-link">Ler guias de orientação →</Link><hr /><h3>Apresentação do TCC</h3><p>Crie um chamado de exemplo e simule o processo de resgate sem precisar informar uma ocorrência.</p><button className="denuncia-btn secundaria" type="button" onClick={exemplo}>Criar exemplo fictício</button><hr /><h3>Como funcionam os créditos?</h3><p>O saldo começa em 100. Uma confirmação soma 10; uma fraude intencional comprovada desconta 25. Uma denúncia inconclusiva não altera o saldo. Aqui, todas as validações são simulações.</p></aside>
            </div>}
            {aba === 'historico' && <section className="denuncia-card">
              <div className="denuncia-card-topo"><h2>Histórico de denúncias</h2><button type="button" className="denuncia-btn secundaria" onClick={() => setAba('nova')}>+ Nova denúncia</button></div>
              <div className="denuncia-filtros"><label>Buscar chamado<input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Protocolo, animal ou localidade" /></label><label>Estado do chamado<select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="todos">Todos</option><option value="ativos">Em andamento</option><option value="encerrados">Encerrados</option>{[...ETAPAS, ...ENCERRAMENTOS].map((estado) => <option key={estado}>{estado}</option>)}</select></label></div>
              {resultados.length ? <div className="denuncia-historico">{resultados.map((item) => <article key={item.id}><div>{(item.foto || item.especieImagem) && <img src={item.foto || item.especieImagem} alt={item.foto ? "Foto da ocorrência" : "Imagem de referência"} />}</div><div><small>{item.id}</small><h3>{item.especie || 'Animal não identificado'}</h3><p>{item.local}</p><small>{formatarData(item.criadoEm)} · Crédito: {creditoChamado(item) > 0 ? '+' : ''}{creditoChamado(item)}</small></div><div className="denuncia-historico-acoes"><span className="denuncia-status">{statusChamado(item)}</span><button type="button" className="denuncia-btn secundaria" onClick={() => abrir(item)}>Ver chamado →</button></div></article>)}</div> : <p className="denuncia-vazio">Nenhum chamado encontrado.</p>}
            </section>}
            {aba === 'acompanhar' && <><label className="denuncia-seletor">Escolha um chamado<select value={selecionado} onChange={(e) => setSelecionado(e.target.value)}><option value="">Selecione uma denúncia</option>{lista.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.especie || 'Animal não identificado'}</option>)}</select></label>{chamado ? <LinhaDoTempo key={chamado.id} chamado={chamado} atualizar={atualizar} /> : <div className="denuncia-card denuncia-login"><h2>Acompanhe seu animal</h2><p>Selecione um chamado ou registre uma nova denúncia demonstrativa.</p><button className="denuncia-btn" type="button" onClick={() => setAba('nova')}>Nova denúncia</button></div>}</>}
          </>}
        </div>
      </main>
      <Rodape />
    </div>
  );
}
