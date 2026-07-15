import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../auth/auth.models';

interface MockUserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  lastLogin: string | null;
}

const users = new Map<string, MockUserRecord>();
let mockRefreshValid = false;
let currentEmail: string | null = null;

users.set('demo@techne.com', {
  id: '1',
  name: 'UsuÃ¡rio Demo',
  email: 'demo@techne.com',
  password: 'Senha123',
  role: 'USER',
  lastLogin: null,
});

function toAuthUser(u: MockUserRecord): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    lastLogin: u.lastLogin,
  };
}

function issueAccess(): string {
  return `mock-access-${Date.now()}`;
}

export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockAuth || !req.url.includes('/auth/')) {
    return next(req);
  }

  const path = req.url.split('?')[0];

  if (req.method === 'POST' && path.endsWith('/auth/register')) {
    const body = req.body as { name: string; email: string; password: string; cpf?: string };
    if (!body?.email || !body?.password || !body?.name) {
      return throwError(
        () => new HttpErrorResponse({ status: 400, error: 'Campos obrigatorios ausentes.' }),
      ).pipe(delay(200));
    }
    if (users.has(body.email.toLowerCase())) {
      return throwError(
        () => new HttpErrorResponse({ status: 400, error: 'E-mail jÃ¡ cadastrado.' }),
      ).pipe(delay(200));
    }
    users.set(body.email.toLowerCase(), {
      id: String(users.size + 1),
      name: body.name,
      email: body.email.toLowerCase(),
      password: body.password,
      role: 'USER',
      lastLogin: null,
    });
    return of(new HttpResponse({ status: 201, body: null })).pipe(delay(250));
  }

  if (req.method === 'POST' && path.endsWith('/auth/login')) {
    const body = req.body as { email: string; password: string };
    const user = users.get(body.email?.toLowerCase());
    if (!user || user.password !== body.password) {
      return throwError(
        () => new HttpErrorResponse({ status: 401, error: 'Login ou senha invÃ¡lidos.' }),
      ).pipe(delay(200));
    }
    user.lastLogin = new Date().toISOString();
    currentEmail = user.email;
    mockRefreshValid = true;
    return of(
      new HttpResponse({
        status: 200,
        body: { accessToken: issueAccess() },
      }),
    ).pipe(delay(250));
  }

  if (req.method === 'POST' && path.endsWith('/auth/refresh')) {
    if (!mockRefreshValid || !currentEmail) {
      return throwError(
        () => new HttpErrorResponse({ status: 401, error: 'Refresh invÃ¡lido.' }),
      ).pipe(delay(150));
    }
    return of(
      new HttpResponse({
        status: 200,
        body: { accessToken: issueAccess() },
      }),
    ).pipe(delay(150));
  }

  if (req.method === 'GET' && path.endsWith('/auth/me')) {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ') || !currentEmail) {
      return throwError(
        () => new HttpErrorResponse({ status: 401, error: 'NÃ£o autenticado.' }),
      ).pipe(delay(150));
    }
    const user = users.get(currentEmail);
    if (!user) {
      return throwError(
        () => new HttpErrorResponse({ status: 401, error: 'NÃ£o autenticado.' }),
      ).pipe(delay(150));
    }
    return of(new HttpResponse({ status: 200, body: toAuthUser(user) })).pipe(delay(150));
  }

  if (req.method === 'POST' && path.endsWith('/auth/logout')) {
    mockRefreshValid = false;
    currentEmail = null;
    return of(new HttpResponse({ status: 204, body: null })).pipe(delay(100));
  }

  return next(req);
};
