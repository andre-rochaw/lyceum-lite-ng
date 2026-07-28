# Lyceum Lite NG — Frontend Angular

Frontend Angular do **Sistema Acadêmico de Matrículas**. Consome a API Spring Boot (`api`) para autenticação, CRUD acadêmico e fluxo de matrículas (criar, confirmar, cancelar), com UI **Angular Material first**.

Este README cobre **somente** o módulo `lyceum-lite-ng`. Documentação da API: [`../api/README.md`](../api/README.md).

---

## Sumário

1. [Pré-requisitos](#pré-requisitos)
2. [Como rodar localmente](#como-rodar-localmente)
3. [Proxy e ambientes](#proxy-e-ambientes)
4. [Tecnologias](#tecnologias)
5. [Arquitetura e organização](#arquitetura-e-organização)
6. [Autenticação e sessão](#autenticação-e-sessão)
7. [Telas e rotas](#telas-e-rotas)
8. [Como validar os fluxos principais](#como-validar-os-fluxos-principais)
9. [Como validar matrícula e limite de vagas](#como-validar-matrícula-e-limite-de-vagas)
10. [Campanha SDD ? PBIs e Phase Specs](#campanha-sdd--pbis-e-phase-specs)
11. [Decisões de implementação](#decisões-de-implementação)
12. [Limitações conhecidas](#limitações-conhecidas)
13. [Uso de IA](#uso-de-ia)
14. [Trechos críticos](#trechos-críticos)

---

## Pré-requisitos

| Item | Observação |
|------|------------|
| Node.js | Compatível com Angular 22 (recomendado **Node 20+ LTS**) |
| npm | Projeto usa `packageManager: npm@10.9.8` |
| API Spring | Em **http://localhost:8080** (padrão da campanha) |
| Banco | SQL Server configurado conforme [`../api/README.md`](../api/README.md) |

Sem a API no ar, o modo padrão (`npm start`) **não** completa os fluxos de domínio. Existe um mock só de auth (`npm run start:mock`) ? **não** use nos testes oficiais da campanha.

---

## Como rodar localmente

### 1) Subir a API

```bash
cd ../api
./run-api.sh
```

Confirme Swagger/login em http://localhost:8080 (detalhes no README da API).

### 2) Subir o Angular (API real — padrão)

```bash
cd lyceum-lite-ng
npm install
npm start
```

Abre em **http://localhost:4200/**.

Atalho equivalente: `npm run start:api`.

### 3) Build de produção (opcional)

```bash
npm run build
```

Saída em `dist/lyceum-lite-ng/`.

### Mock de autenticação (opcional)

Somente se a API estiver fora do ar e você quiser exercitar login/shell:

```bash
npm run start:mock
```

- Ambiente: `environment.mock.ts` (`useMockAuth: true`)
- Usuário seed: `demo@techne.com` / `Senha123`
- **Não** cobre CRUD/matrículas reais
- F5 **não** recupera sessão no mock

---

## Proxy e ambientes

### Proxy

`proxy.conf.json` encaminha:

```
/api  →  http://localhost:8080
```

com `pathRewrite` removendo o prefixo `/api`.  
Exemplo: front chama `/api/matriculas` → backend recebe `/matriculas`.

### Environments

| Arquivo | Uso |
|---------|-----|
| `src/environments/environment.development.ts` | Dev padrão (`useMockAuth: false`, `apiUrl: '/api'`) |
| `src/environments/environment.ts` | Produção |
| `src/environments/environment.mock.ts` | Só com `npm run start:mock` |

Não é necessário alterar URL da API no dia a dia: o proxy resolve o ambiente local.

---

## Tecnologias

| Camada | Escolha |
|--------|---------|
| Framework | **Angular 22** |
| UI | **Angular Material 3** + CDK |
| Layout utilitário | Tailwind CSS 4 |
| Estado | **Signals** (sem NgRx) |
| HTTP | `HttpClient` + interceptors |
| Forms | Reactive Forms |
| Linguagem | TypeScript ~6 |
| Teste unitário (scaffold) | Vitest (`ng test`) |

Pacote `motion` está no `package.json`, mas **não é requisito** da campanha (pode ser ignorado).

---

## Arquitetura e organização

```
lyceum-lite-ng/src/app/
├── core/
│   ├── auth/              # AuthService, modelos
│   ├── guards/            # authGuard, guestGuard
│   ├── interceptors/      # auth, refresh, loading, error, mock
│   └── services/          # NotificationService, LoadingService
├── layouts/
│   ├── auth-layout/       # login / register
│   └── main-layout/       # shell (toolbar + sidenav)
├── features/
│   ├── auth/              # login, register
│   ├── home/
│   ├── alunos/
│   ├── cursos/
│   ├── disciplinas/
│   ├── turmas/
│   └── matriculas/
└── shared/                # utils / animações (sem design system)
```

Padrão por feature de domínio:

```
features/<dominio>/
├── models/
├── data/<dominio>.service.ts    # HTTP
├── pages/*-list | *-form
├── components/                  # dialogs de exclusão, pickers
└── <dominio>.routes.ts          # lazy
```

**Separation of Concerns:** regras de matrícula/vagas ficam no **backend**. O front apenas chama a API e exibe sucesso/erro (SnackBar / interceptor).

---

## Autenticação e sessão

### Endpoints consumidos (API real)

| Ação | Path (via proxy) |
|------|------------------|
| Cadastro | `POST /api/usuario/criar` |
| Login | `POST /api/usuario/login` ? JSON `{ "token": "..." }` |
| Me | `GET /api/usuario/por-token-jwt` |
| Logout | `POST /api/usuario/logout` |
| Refresh | `POST /api/usuario/refresh` (cookie HttpOnly; ver limitações) |

Cadastro na UI: Nome, E-mail, CPF (`999.999.999-99`), Senha, Confirmar senha.  
Após cadastro → redireciona para `/login` (não autentica automaticamente).

### Modelo de sessão

- **Access token** só em memória (`signal` no `AuthService`) — não em `localStorage`
- **Refresh** via cookie HttpOnly + `withCredentials`
- `authInterceptor` injeta `Authorization: Bearer ?`
- `refreshInterceptor` tenta renovar após 401
- `errorInterceptor` → SnackBar (inclui **409** de regra)
- `loadingInterceptor` → spinner global

### Guards

| Guard | Rotas | Comportamento |
|-------|-------|----------------|
| `authGuard` | shell (`/home`, CRUDs, matrículas) | Sem sessão → `ensureSession()`; falha → `/login` |
| `guestGuard` | `/login`, `/register` | Já autenticado na SPA → `/home` |

---

## Telas e rotas

| Rota | Feature | Guard | Observação |
|------|---------|-------|------------|
| `/login`, `/register` | Auth | Guest | Layout público |
| `/home` | Home | Auth | Landing autenticada |
| `/alunos`, `/alunos/novo`, `/alunos/:id/editar` | Alunos | Auth | CRUD + dialog excluir |
| `/cursos`, … | Cursos | Auth | CRUD |
| `/disciplinas`, … | Disciplinas | Auth | Autocomplete de Curso |
| `/turmas`, … | Turmas | Auth | Vagas (ocupadas/limite), status chip, vínculo Disciplina |
| `/matriculas` | Matrículas | Auth | Lista + confirmar/cancelar (dialog) |
| `/matriculas/novo` | Matrículas | Auth | Criar (só `alunoId` + `turmaId`) + resumo da turma |
| `**` | 404 | - | Página não encontrada |

Menu do shell: Home, Alunos, Cursos, Disciplinas, Turmas, Matrículas, Logout.

### Matrículas (comportamento UI)

- Listagem: `MatTable` + paginação/ordenação **server-side** (`MatSort` → `sort` do Pageable); filtros `alunoId`, `turmaId`, `status`; status com `MatChip`
- Criar: busca de aluno + picker de turma; submit só UUIDs; status inicial `PENDENTE` na API; resumo da turma (disciplina, curso, status, vagas) antes de salvar
- **Confirmar** / **Cancelar** com `MatDialog` de confirmação (visíveis conforme status)
- Empty state com CTA quando não há registros
- Sem rota de editar / sem `DELETE` de matrícula

---

## Como validar os fluxos principais

Com API + front no ar:

1. Abra http://localhost:4200/login  
2. Cadastre um usuário (ou use um já criado na API)  
3. Faça login → deve cair no shell (`/home`) com sidenav  
4. **Cursos** → criar um curso  
5. **Disciplinas** → criar vinculada ao curso  
6. **Turmas** → criar com status **ABERTA**, `limiteVagas` ? 1  
7. **Alunos** → criar aluno  
8. **Matrículas** → Nova matrícula → selecionar aluno e turma ? salvar  
9. Na listagem → **Confirmar** → status `CONFIRMADA`  
10. Em **Turmas**, conferir `vagasOcupadas` incrementado  
11. **Cancelar** matrícula confirmada ? vaga liberada  

Erros de regra (turma não aberta, duplicidade, sem vaga) devem aparecer no SnackBar como **409** com mensagem da API.

---

## Como validar matrícula e limite de vagas

1. Crie turma `ABERTA` com **limite de vagas = 1**.  
2. Crie dois alunos (A e B).  
3. Matricule A → confirme → ocupação = 1.  
4. Matricule B (fica `PENDENTE`).  
5. Tente **Confirmar** B → SnackBar de conflito (409: sem vagas); B permanece `PENDENTE`.  
6. Cancele A (confirmada) → ocupação volta; confirme B ? deve funcionar.

O front **não** recalcula vagas localmente — a verdade está na API (`MatriculaService` no backend).

---

## Campanha SDD ? PBIs e Phase Specs

Desenvolvimento por **Specification Driven Development** (`docs/guia-campanha.md` + `docs/frontend/guia-campanha.md`).

### Fluxo por fatia

```
PBI (pbis/ng)
  → Phase Spec (docs/phases) EM_REVISÃO
  → aprovação das decisões D-XX (revisão humana)
  → implementação (código) → Phase Spec IMPLEMENTADA
  → Test Strategy / validação manual
  → próximo PBI
```

### PBIs do frontend

| PBI | Escopo | Phase Spec | Status |
|-----|--------|------------|--------|
| **F-001** | Autenticação, shell, interceptors, guards | `docs/phases/F-001-phase-spec.md` | IMPLEMENTADA |
| **F-002** | Módulo Alunos | `docs/phases/F-002-phase-spec.md` | IMPLEMENTADA |
| **F-003** | Módulo Cursos | `docs/phases/F-003-phase-spec.md` | IMPLEMENTADA |
| **F-004** | Módulo Disciplinas | `docs/phases/F-004-phase-spec.md` | IMPLEMENTADA |
| **F-005** | Módulo Turmas | `docs/phases/F-005-phase-spec.md` | IMPLEMENTADA |
| **F-006** | Módulo Matrículas | `docs/phases/F-006-phase-spec.md` | IMPLEMENTADA |

PBIs em: `pbis/ng/`.

### Revisão manual

Em cada PBI frontend:

1. **Aprovar Phase Spec** → contratos TS alinhados à API real (A-00x), rotas, Material first, o que fica fora de escopo.  
2. **Executar** → implementar sem reabrir auth nem inventar endpoints.  
3. **Validar na UI** → Network (payloads), SnackBar 400/404/409, regressão das features anteriores.  
4. **Matrículas (F-006)** → revisar que o client **não** reimplementa RNs de vaga/duplicidade.

---

## Decisões de implementação

1. **Material first** — sem `shared/ui` genérico; Tailwind só layout.  
2. **Features isoladas** + lazy routes.  
3. **Proxy `/api`** — front e API em portas diferentes sem CORS complexo no dia a dia.  
4. **Access token em memória** + cookie HttpOnly para refresh.  
5. **Signals** para estado local; sem store global.  
6. **RNs só no backend** — front exibe resultado (D-08 da F-006).  
7. **Matrícula sem editar/excluir** — só criar + confirmar/cancelar.  
8. **Autocompletes** (debounce + empty state) para vínculos (curso/disciplina/turma/aluno).  
9. **Paginação e ordenação server-side** nas listagens (`MatPaginator` + `MatSort` → Pageable).  
10. **Mock de auth opcional** — campanha valida sempre contra API real.

---

## Limitações conhecidas

- Depende da API em `:8080`; sem backend, domínio acadêmico não funciona.  
- Mock cobre só autenticação, não Alunos/Cursos/…/Matrículas.  
- Endpoint `POST /usuario/refresh` é chamado pelo front; se a API do ambiente não expuser o recurso, F5 / silent refresh podem falhar (login novo resolve).  
- Alguns labels do shell podem exibir encoding quebrado em acentos (arquivo legado ISO/UTF-8).  
- Pacote `motion` instalado, mas não é parte do fluxo obrigatório.  
- E2E automatizado não é obrigatório nesta campanha.  
- F-006 documenta feedback de 409; a fonte da verdade das RNs continua sendo A-005 / `MatriculaService` na API.

---

## Uso de IA

Ferramentas de IA (Cursor / agentes) apoiaram a campanha SDD e a implementação Angular.

| Parte | Uso de IA | Revisão manual |
|-------|-----------|----------------|
| Phase Specs F-001–F-006 | Rascunho D-XX / CA-XX / escopo | Aprovação vs PBI e contrato real da API |
| Fundação auth (F-001) | Guards, interceptors, layouts | Sessão em memória, proxy, fluxo login/cadastro |
| Features Alunos–Turmas | List/form Material + services HTTP | CRUD ponta a ponta, dialogs de exclusão |
| Feature Matrículas (F-006) | Lista, form, autocompletes, confirmar/cancelar | Body só `alunoId`/`turmaId`; 409 no SnackBar; sem RN no client |
| Este README | Estrutura e roteiro | Alinhamento com rotas, environments e Phase Specs |

**Revisão crítica:** payloads de matrícula, ações condicionadas ao status, e não mutar `vagasOcupadas` na UI.

---

## Trechos críticos

1. **`AuthService`** ? login/register/me/logout; token em Signal.  
2. **Interceptors** ? Bearer, 401?refresh, erros?SnackBar, loading.  
3. **`authGuard` / `guestGuard`** — proteção do shell.  
4. **`MatriculaService` (HTTP)** ? listar/criar/confirmar/cancelar.  
5. **`matricula-form` / `matricula-list`** — autocomplete + ações de status sem reimplementar regras.

---

## Referências

| Artefato | Caminho |
|----------|---------|
| Desafio | `DESAFI_3.DOC` |
| Guia geral SDD | `docs/guia-campanha.md` |
| Guia frontend | `docs/frontend/guia-campanha.md` |
| PBIs NG | `pbis/ng/` |
| Phase Specs | `docs/phases/F-00*.md` |
| README da API | `api/README.md` |
| Testes unitários API | `README-tests.md` |

---

## Resumo rápido

```bash
# Terminal 1 ? API
cd api && ./run-api.sh

# Terminal 2 ? Front
cd lyceum-lite-ng
npm install
npm start
# http://localhost:4200
# login → Cursos → Disciplinas → Turmas (ABERTA) → Alunos → Matrículas
```
