import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Denuncia from './denuncia';

jest.mock('../../componentes/cabecalho/cabecalho.jsx', () => () => null);
jest.mock('../../componentes/rodape/rodape.jsx', () => () => null);
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, className }) => <a href={to} className={className}>{children}</a>,
  useLocation: () => ({ search: '' })
}));

beforeEach(() => {
  sessionStorage.clear();
  window.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id_usuario: 1 }) });
});

test('visitante não pode registrar denúncia', async () => {
  render(<Denuncia />);
  expect(await screen.findByRole('link', { name: 'Fazer login' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Registrar denúncia/ })).toBeNull();
});

test('usuário registra exemplo, avança e filtra o histórico', async () => {
  sessionStorage.setItem('rop_token', 'token-teste');
  render(<Denuncia />);
  fireEvent.click(await screen.findByRole('button', { name: 'Criar exemplo fictício' }));
  expect(screen.getByRole('heading', { name: 'Acompanhe seu animal' })).toBeTruthy();
  for (let i = 0; i < 5; i += 1) fireEvent.click(screen.getByRole('button', { name: /Avançar para:/ }));
  expect(screen.getAllByText('Animal resgatado').length).toBeGreaterThan(0);
  expect(screen.getByText('110')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Histórico de denúncias' }));
  expect(screen.getByRole('button', { name: /Ver chamado/ })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Estado do chamado'), { target: { value: 'Recebida' } });
  await waitFor(() => expect(screen.getByText('Nenhum chamado encontrado.')).toBeTruthy());
});
