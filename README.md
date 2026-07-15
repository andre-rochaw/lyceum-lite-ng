# Lyceum Lite NG

Frontend Angular da campanha (fundacao + futuros fluxos academicos).

## Subir o app (padrao = API real)

Pre-requisito: backend Spring em `http://localhost:8080`.

```bash
npm install
npm start
```

Abre em `http://localhost:4200/`.

- Proxy: `proxy.conf.json` encaminha `/api` → `http://localhost:8080`
- Ambiente padrao (`environment.development.ts`): `useMockAuth: false`
- Auth chama os endpoints reais:
  - `POST /api/usuario/criar` (envia `cpf` no formato `999.999.999-99`)
  - `POST /api/usuario/login` (resposta JSON usa `token`, nao `accessToken`)
  - `POST /api/usuario/refresh` (cookie HttpOnly → novo access `token`)
  - `GET /api/usuario/por-token-jwt`
  - `POST /api/usuario/logout`

Guards (`GuestGuard` / `AuthGuard`) usam `ensureSession()` (refresh + me). Com cookie valido, `/login` e `/register` redirecionam para `/home`; apos logout, `/home` volta para `/login`.

Atalho equivalente: `npm run start:api`.

Cadastro na UI: Nome, E-mail, CPF, Senha, Confirmar senha.

## Mock (opcional — nao usar nos testes da campanha)

Somente quando a API estiver fora do ar:

```bash
npm run start:mock
```

Isso sobe o Angular com `src/environments/environment.mock.ts` (`useMockAuth: true`).

- Contratos simulados em `/api/auth/*` via `mockAuthInterceptor`
- Usuario seed: `demo@techne.com` / `Senha123`
- Access token so em memoria (Signals)
- Refresh simulado em memoria (nao e cookie HttpOnly real)

**Limitacao mock:** F5 nao recupera sessao.

## Apos cadastro

O fluxo redireciona para `/login` (nao autentica automaticamente).

## Rotas

| Rota | Layout | Guard |
|------|--------|-------|
| `/login`, `/register` | auth-layout | GuestGuard |
| `/home` | main-layout (shell) | AuthGuard |

## Stack

Angular 22 · Angular Material · Tailwind (layout) · Signals · HttpClient
