import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const SKIP_TOAST_CTX = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!req.context.get(SKIP_TOAST_CTX)) {
        notifications.error(mapHttpError(error));
      }
      return throwError(() => error);
    }),
  );
};

function mapHttpError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Falha na comunicacao com o servidor.';
  }

  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }
  if (Array.isArray(error.error) && error.error.length) {
    return error.error.join('; ');
  }
  if (error.error?.message) {
    return String(error.error.message);
  }

  switch (error.status) {
    case 0:
      return 'Nao foi possivel conectar a API. Verifique se ela esta no ar.';
    case 400:
      return 'Dados invalidos. Verifique o formulario.';
    case 401:
      return 'Sessao expirada. Faca login novamente.';
    case 403:
      return 'Sem permissao para esta operacao.';
    case 404:
      return 'Recurso nao encontrado.';
    case 500:
      return 'Erro inesperado no servidor.';
    default:
      return error.message || 'Falha na comunicacao com o servidor.';
  }
}
