import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { extractApiErrorMessage } from '../../shared/utils/api-error';

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
    return 'Falha na comunicação com o servidor.';
  }

  const fromApi = extractApiErrorMessage(error.error);
  if (fromApi) {
    return fromApi;
  }

  switch (error.status) {
    case 0:
      return 'Não foi possível conectar à API. Verifique se ela está no ar.';
    case 400:
      return 'Dados inválidos. Verifique o formulário.';
    case 401:
      return 'Sessão expirada. Faça login novamente.';
    case 403:
      return 'Sem permissão para esta operação.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Conflito: registro duplicado ou regra de negocio.';
    case 500:
      return 'Erro interno do servidor.';
    default:
      return error.message || 'Falha na comunicação com o servidor.';
  }
}
