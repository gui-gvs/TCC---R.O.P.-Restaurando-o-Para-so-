export const ETAPAS = [
  'Recebida', 'Em análise', 'Equipe acionada', 'A caminho', 'No local',
  'Animal resgatado', 'Em transporte', 'Em atendimento', 'Em tratamento',
  'Em recuperação', 'Reintroduzido à natureza', 'Concluída'
];

export const ENCERRAMENTOS = [
  'Animal não localizado', 'Encaminhado a outro órgão', 'Denúncia duplicada',
  'Animal não sobreviveu', 'Denúncia falsa intencional'
];

const chave = (id) => `rop:denuncias-demo:${id}`;
export const statusChamado = (chamado) => chamado.encerramento || ETAPAS[chamado.etapa];
export const finalizado = (chamado) => Boolean(chamado.encerramento) || chamado.etapa === ETAPAS.length - 1;
export const creditoChamado = (chamado) => chamado.validacao === 'falsa' ? -25 : chamado.validacao === 'confirmada' ? 10 : 0;

export function lerDenuncias(id) {
  if (id == null) return [];
  try {
    const lista = JSON.parse(sessionStorage.getItem(chave(id)) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function salvarDenuncias(id, lista) {
  sessionStorage.setItem(chave(id), JSON.stringify(lista));
  window.dispatchEvent(new Event('rop:denuncias'));
}

export function resumoDenuncias(lista) {
  return {
    total: lista.length,
    creditos: Math.max(0, 100 + lista.reduce((soma, item) => soma + creditoChamado(item), 0)),
    confirmadas: lista.filter((item) => item.validacao === 'confirmada').length,
    falsas: lista.filter((item) => item.validacao === 'falsa').length,
    ativos: lista.filter((item) => !finalizado(item)).length
  };
}

export function criarChamado(campos) {
  const agora = new Date().toISOString();
  const codigo = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    ...campos,
    id: `ROP-${codigo.slice(0, 18).toUpperCase()}`,
    criadoEm: agora,
    etapa: 0,
    validacao: 'pendente',
    encerramento: '',
    historico: [{ estado: ETAPAS[0], data: agora }]
  };
}

export function avancarChamado(chamado, encerramento = '') {
  if (finalizado(chamado)) return chamado;
  if (encerramento && !ENCERRAMENTOS.includes(encerramento)) return chamado;
  if (encerramento === 'Denúncia falsa intencional' && chamado.validacao === 'confirmada') return chamado;
  const etapa = encerramento ? chamado.etapa : chamado.etapa + 1;
  const validacao = encerramento === 'Denúncia falsa intencional' ? 'falsa'
    : etapa >= 5 ? 'confirmada' : encerramento ? 'inconclusiva' : 'pendente';
  return {
    ...chamado, etapa, validacao, encerramento,
    historico: [...chamado.historico, { estado: encerramento || ETAPAS[etapa], data: new Date().toISOString() }]
  };
}
