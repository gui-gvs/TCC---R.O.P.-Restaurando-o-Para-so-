import { ETAPAS, criarChamado, avancarChamado, creditoChamado, finalizado, lerDenuncias, salvarDenuncias, resumoDenuncias } from './denuncias';

const criar = () => criarChamado({ especie: 'Tucano', local: 'Local fictício' });

beforeEach(() => sessionStorage.clear());

test('começa como recebida e registra toda a jornada sem crédito duplicado', () => {
  let chamado = criar();
  expect(chamado.historico).toHaveLength(1);
  for (let i = 1; i < ETAPAS.length; i += 1) {
    chamado = avancarChamado(chamado);
    expect(chamado.etapa).toBe(i);
    expect(creditoChamado(chamado)).toBe(i >= 5 ? 10 : 0);
  }
  expect(finalizado(chamado)).toBe(true);
  expect(chamado.historico.map(evento => evento.estado)).toEqual(ETAPAS);
  expect(avancarChamado(chamado)).toBe(chamado);
  expect(resumoDenuncias([chamado]).creditos).toBe(110);
});

test('fraude intencional desconta créditos, mas ausência do animal não desconta', () => {
  const fraude = avancarChamado(criar(), 'Denúncia falsa intencional');
  const inconclusiva = avancarChamado(criar(), 'Animal não localizado');
  expect(resumoDenuncias([fraude, inconclusiva])).toEqual({
    total: 2, creditos: 75, confirmadas: 0, falsas: 1, ativos: 0
  });
  expect(avancarChamado(fraude)).toBe(fraude);
});

test('histórico fica isolado por conta na sessão', () => {
  const chamado = criar();
  salvarDenuncias(1, [chamado]);
  expect(lerDenuncias(1)).toEqual([chamado]);
  expect(lerDenuncias(2)).toEqual([]);
});
