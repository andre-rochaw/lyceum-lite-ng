/**
 * Ambiente opcional ? usar somente com:
 *   npm run start:mock
 *
 * Nao e o padrao da campanha. Testes manuais F-001 consomem a API em :8080.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
  useMockAuth: true,
};
