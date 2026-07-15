export const environment = {
  production: true,
  /** Proxy em dev: /api ? http://localhost:8080 (proxy.conf.json). */
  apiUrl: '/api',
  /** Padrao: API real. Mock so via `npm run start:mock`. */
  useMockAuth: false,
};
