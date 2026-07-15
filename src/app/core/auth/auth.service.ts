import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_TOAST_CTX } from '../interceptors/error.interceptor';
import { SKIP_LOADING_CTX } from '../interceptors/loading.interceptor';
import {
  AccessTokenResponse,
  AuthUser,
  LoginRequest,
  MockAccessTokenResponse,
  RegisterRequest,
} from './auth.models';

/** Bootstrap / silent refresh: sem toast e sem spinner global. */
const silentHttp = () =>
  new HttpContext().set(SKIP_TOAST_CTX, true).set(SKIP_LOADING_CTX, true);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.accessTokenSignal() && !!this.currentUserSignal());

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  setAccessToken(token: string | null): void {
    this.accessTokenSignal.set(token);
  }

  login(request: LoginRequest): Observable<AuthUser> {
    if (environment.useMockAuth) {
      return this.http
        .post<MockAccessTokenResponse>(`${environment.apiUrl}/auth/login`, request, {
          withCredentials: true,
        })
        .pipe(
          tap((res) => this.accessTokenSignal.set(res.accessToken)),
          switchMap(() => this.me()),
        );
    }

    return this.http
      .post<AccessTokenResponse>(
        `${environment.apiUrl}/usuario/login`,
        { login: request.email, password: request.password },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => this.accessTokenSignal.set(res.token)),
        switchMap(() => this.me()),
      );
  }

  register(request: RegisterRequest): Observable<void> {
    if (environment.useMockAuth) {
      return this.http
        .post<void>(`${environment.apiUrl}/auth/register`, request, { withCredentials: true })
        .pipe(map(() => undefined));
    }

    const username = request.email.split('@')[0]?.slice(0, 20) || 'usuario';
    return this.http
      .post(`${environment.apiUrl}/usuario/criar`, {
        login: request.email,
        password: request.password,
        name: request.name,
        username,
        cpf: request.cpf,
        twoFactorEnabled: false,
        refreshTokenEnabled: true,
      })
      .pipe(map(() => undefined));
  }

  refresh(): Observable<string> {
    if (environment.useMockAuth) {
      return this.http
        .post<MockAccessTokenResponse>(
          `${environment.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true, context: silentHttp() },
        )
        .pipe(
          map((res) => res.accessToken),
          tap((token) => this.accessTokenSignal.set(token)),
        );
    }

    return this.http
      .post<AccessTokenResponse>(
        `${environment.apiUrl}/usuario/refresh`,
        {},
        { withCredentials: true, context: silentHttp() },
      )
      .pipe(
        map((res) => res.token),
        tap((token) => this.accessTokenSignal.set(token)),
      );
  }

  me(silent = false): Observable<AuthUser> {
    const options = {
      withCredentials: true as const,
      ...(silent ? { context: silentHttp() } : {}),
    };

    if (environment.useMockAuth) {
      return this.http
        .get<AuthUser>(`${environment.apiUrl}/auth/me`, options)
        .pipe(tap((user) => this.currentUserSignal.set(user)));
    }

    return this.http
      .get<{
        id: string;
        login: string;
        name: string;
        role: string;
      }>(`${environment.apiUrl}/usuario/por-token-jwt`, options)
      .pipe(
        map(
          (u): AuthUser => ({
            id: u.id,
            email: u.login,
            name: u.name,
            role: u.role ?? 'USER',
            lastLogin: new Date().toISOString(),
          }),
        ),
        tap((user) => this.currentUserSignal.set(user)),
      );
  }

  logout(): Observable<void> {
    const url = environment.useMockAuth
      ? `${environment.apiUrl}/auth/logout`
      : `${environment.apiUrl}/usuario/logout`;

    return this.http
      .post<void>(url, {}, { withCredentials: true, context: silentHttp() })
      .pipe(
        catchError(() => of(undefined)),
        tap(() => {
          this.clearSessionLocal();
          void this.router.navigateByUrl('/login');
        }),
        map(() => undefined),
      );
  }

  /** Usado pelo AuthGuard (ex.: F5 em /home). Nao bloquear /login com isto. */
  ensureSession(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }

    return this.refresh().pipe(
      switchMap(() => this.me(true)),
      map(() => true),
      catchError(() => {
        this.clearSessionLocal();
        return of(false);
      }),
    );
  }

  private clearSessionLocal(): void {
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
  }
}
