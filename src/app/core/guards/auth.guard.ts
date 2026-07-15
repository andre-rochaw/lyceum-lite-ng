import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth/auth.service';

/**
 * Rotas privadas: exige sessao.
 * Sem access em memoria, tenta refresh via cookie; se falhar ? /login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return auth.ensureSession().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/login']))),
  );
};
