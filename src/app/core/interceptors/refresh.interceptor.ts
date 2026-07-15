import {
  HttpContext,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SKIP_TOAST_CTX } from './error.interceptor';

const RETRIED = 'X-Auth-Retried';

let refreshInFlight: ReturnType<AuthService['refresh']> | null = null;

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/usuario/login') ||
    req.url.includes('/usuario/criar') ||
    req.url.includes('/usuario/refresh') ||
    req.url.includes('/usuario/logout')
  ) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.headers.has(RETRIED)) {
        return throwError(() => error);
      }

      const refresh$ =
        refreshInFlight ??
        auth.refresh().pipe(
          shareReplay({ bufferSize: 1, refCount: true }),
          finalize(() => {
            refreshInFlight = null;
          }),
          catchError((refreshErr) => {
            auth.setAccessToken(null);
            void router.navigateByUrl('/login');
            return throwError(() => refreshErr);
          }),
        );

      refreshInFlight = refresh$;

      return refresh$.pipe(
        switchMap((token) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
                [RETRIED]: '1',
              },
              context: new HttpContext().set(SKIP_TOAST_CTX, false),
              withCredentials: true,
            }),
          ),
        ),
      );
    }),
  );
};
