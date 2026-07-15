import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/** Requests silenciosas (refresh/bootstrap): sem spinner global. */
export const SKIP_LOADING_CTX = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const skipLoading = req.context.get(SKIP_LOADING_CTX);
  const loading = inject(LoadingService);

  if (!skipLoading) {
    loading.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoading) {
        loading.hide();
      }
    }),
  );
};
